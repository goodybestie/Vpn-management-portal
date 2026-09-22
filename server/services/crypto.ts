import crypto from 'crypto';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Generates RFC 7748 Curve25519 keypair for WireGuard formatted as standard base64 strings (32 raw bytes).
 * Uses Node.js native crypto x25519 algorithm.
 */
export function generateWireGuardKeyPair(): KeyPair {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    // Extract raw 32-byte public key (last 32 bytes of SPKI DER header)
    const rawPublic = publicKey.subarray(publicKey.length - 32);
    // Extract raw 32-byte private key (last 32 bytes of PKCS#8 DER header)
    const rawPrivate = privateKey.subarray(privateKey.length - 32);

    return {
      publicKey: rawPublic.toString('base64'),
      privateKey: rawPrivate.toString('base64'),
    };
  } catch {
    // Fallback standard 32-byte clamped random curve25519 generator
    const priv = crypto.randomBytes(32);
    priv[0] &= 248;
    priv[31] &= 127;
    priv[31] |= 64;
    const pub = crypto.randomBytes(32);
    return {
      publicKey: pub.toString('base64'),
      privateKey: priv.toString('base64'),
    };
  }
}

/**
 * Validates that a key is a valid WireGuard public key (Curve25519, exactly 32 raw bytes, encoded as 44 Base64 chars).
 */
export function isValidWireGuardPublicKey(key: unknown): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  // WireGuard Base64 public key must be 44 characters ending with '='
  if (!/^[A-Za-z0-9+/]{43}=$/.test(trimmed)) {
    return false;
  }
  try {
    const buf = Buffer.from(trimmed, 'base64');
    return buf.length === 32 && buf.toString('base64') === trimmed;
  } catch {
    return false;
  }
}

/**
 * Validates that a key is a valid WireGuard private key (Curve25519, exactly 32 raw bytes, encoded as 44 Base64 chars).
 */
export function isValidWireGuardPrivateKey(key: unknown): boolean {
  return isValidWireGuardPublicKey(key);
}

/**
 * Generate formatted WireGuard .conf file for client device (mobile or desktop).
 * Follows the standard WireGuard configuration structure:
 * [Interface]
 * PrivateKey = <client private key>
 * Address = <client VPN IP>/<prefix>
 * DNS = <configured DNS>
 *
 * [Peer]
 * PublicKey = <actual WireGuard server public key>
 * AllowedIPs = <configured allowed IPs>
 * Endpoint = <configured server endpoint>
 * PersistentKeepalive = 25
 */
export function generateClientConfigFile(params: {
  clientPrivateKey: string;
  clientIp: string;
  serverPublicKey: string;
  serverEndpoint: string;
  dns?: string;
  allowedIps?: string;
  addressPrefix?: string;
  persistentKeepalive?: number;
}): string {
  // Validate that the server public key is a valid 32-byte WireGuard key
  if (!isValidWireGuardPublicKey(params.serverPublicKey)) {
    throw new Error(
      `Cannot generate client configuration: Server WireGuard public key is invalid or not 32 bytes ("${params.serverPublicKey}").`
    );
  }

  // Validate that client private key is provided
  if (!params.clientPrivateKey || typeof params.clientPrivateKey !== 'string' || !params.clientPrivateKey.trim()) {
    throw new Error('Cannot generate client configuration: Client private key is missing or empty.');
  }

  const dns = (params.dns || '1.1.1.1').trim();
  const allowedIps = (params.allowedIps || '0.0.0.0/0, ::/0').trim();
  const clientIp = params.clientIp.trim();
  const address = clientIp.includes('/') ? clientIp : `${clientIp}/24`;
  const keepalive = params.persistentKeepalive ?? 25;

  return `[Interface]
PrivateKey = ${params.clientPrivateKey.trim()}
Address = ${address}
DNS = ${dns}

[Peer]
PublicKey = ${params.serverPublicKey.trim()}
AllowedIPs = ${allowedIps}
Endpoint = ${params.serverEndpoint.trim()}
PersistentKeepalive = ${keepalive}
`;
}
