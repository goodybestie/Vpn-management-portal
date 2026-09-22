import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { VpnProfile } from '../../types';
import { fetchProfileQr } from '../../api/client';
import { Download, Copy, Check, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: VpnProfile | null;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, profile }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confContent, setConfContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      setIsLoading(true);
      setError(null);
      fetchProfileQr(profile.id)
        .then((res) => {
          setQrDataUrl(res.qrDataUrl);
          setConfContent(res.confContent);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load QR code');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setQrDataUrl(null);
      setConfContent(null);
    }
  }, [isOpen, profile]);

  const handleCopy = () => {
    if (confContent) {
      navigator.clipboard.writeText(confContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (qrDataUrl && profile) {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `FoundationPoly_QR_${profile.studentId.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.click();
    }
  };

  if (!profile) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mobile WireGuard QR Code"
      subtitle={`Scan to import VPN tunnel on Android or iOS • ${profile.studentId}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin mb-3" />
            <p className="text-slate-500">Rendering high-density QR code...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : (
          <>
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-xs border border-slate-200">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`WireGuard QR Code for ${profile.studentId}`}
                  className="w-64 h-64 object-contain rounded-lg"
                />
              )}
              <div className="mt-2 text-center text-slate-900">
                <span className="font-bold text-xs">{profile.fullName}</span>
                <span className="block text-[11px] font-mono text-slate-500">{profile.vpnIp}</span>
              </div>
            </div>

            {/* Mobile Instructions */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-semibold">
                <Smartphone className="w-4 h-4" />
                <span>Mobile Import Instructions:</span>
              </div>
              <ol className="text-[11px] text-slate-600 list-decimal list-inside space-y-1">
                <li>Install official <strong>WireGuard</strong> from Google Play Store or Apple App Store.</li>
                <li>Tap the <strong>+</strong> button and choose <strong>Create from QR code</strong>.</li>
                <li>Point camera at the code above and name tunnel <strong>FoundationPoly</strong>.</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                id="btn-download-qr-img"
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Save QR Image
              </button>

              <button
                id="btn-copy-conf-text"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Config!' : 'Copy Config Text'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
