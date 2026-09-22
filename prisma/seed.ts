/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * VPN Management and Traffic Auditing Portal
 * Database Seed Script for Prisma & SQLite
 */

import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('FOUNDATION POLYTECHNIC - VPN MANAGEMENT PORTAL');
  console.log('Case Study: Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria');
  console.log('Executing Database Seed (SQLite & Prisma ORM)...');
  console.log('================================================================');

  // 1. Seed Initial Administrator using environment variables
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@foundationpoly.edu.ng').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Foundation@2026!';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  const allAdmins = await prisma.admin.findMany();
  const existingAdmin = allAdmins.find(
    (a) => a.email.toLowerCase().trim() === adminEmail
  );

  let admin;
  if (existingAdmin) {
    admin = await prisma.admin.update({
      where: { id: existingAdmin.id },
      data: {
        email: adminEmail,
        passwordHash, // Ensure hash matches current configured ADMIN_PASSWORD
        role: 'ADMIN',
        updatedAt: new Date(),
      },
    });
    console.log(`[Seed:Admin] Reused and updated existing administrator: ${admin.email} (Role: ${admin.role})`);
  } else {
    admin = await prisma.admin.create({
      data: {
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`[Seed:Admin] Created new administrator: ${admin.email} (Role: ${admin.role})`);
  }

  // Record Admin seed audit log
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_SEEDED',
      description: `Administrator account synchronized for ${admin.email}`,
      actor: admin.id,
      targetType: 'ADMIN',
      targetId: admin.id,
      metadata: JSON.stringify({ email: admin.email, role: admin.role }),
    },
  });

  // 2. Seed Initial Foundation Polytechnic Student VPN Profiles (if empty)
  const profileCount = await prisma.vpnProfile.count();
  if (profileCount === 0) {
    console.log('[Seed:Profiles] Seeding initial institutional VPN student profiles...');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);

    const initialProfiles = [
      {
        id: 'prof-fp-001',
        name: 'Bassey Emmanuel Okon',
        studentId: 'FP/ND/CS/22/041',
        department: 'Computer Science',
        email: 'emmanuel.okon@foundationpoly.edu.ng',
        phone: '+234 803 412 8901',
        description: 'Final Year Project Lead - IoT Network Lab',
        vpnIp: '10.8.0.2',
        publicKey: 'uY3bB7H+9n2zFm1XW8kQ0p4r5t6v7w8x9y0z1a2b3c4=',
        privateKey: null, // Protected / encrypted in production
        status: 'ACTIVE',
        createdAt: threeDaysAgo,
        updatedAt: tenMinsAgo,
        lastHandshake: tenMinsAgo,
        bytesReceived: BigInt(1420500120),
        bytesSent: BigInt(389120400),
        isConnected: true,
        endpoint: '105.112.45.18:41230',
      },
      {
        id: 'prof-fp-002',
        name: 'Udoh Anietie Sunday',
        studentId: 'FP/HND/EE/23/018',
        department: 'Electrical / Electronic Engineering',
        email: 'anietie.udoh@foundationpoly.edu.ng',
        phone: '+234 814 590 3211',
        description: 'Telecommunication & Embedded Systems Lab',
        vpnIp: '10.8.0.3',
        publicKey: 'wK9pL2eNmR4tUvXyZa1B3cD5fG7hI9jK0lM2nO4pQ6r=',
        privateKey: null,
        status: 'ACTIVE',
        createdAt: threeDaysAgo,
        updatedAt: oneHourAgo,
        lastHandshake: oneHourAgo,
        bytesReceived: BigInt(650230100),
        bytesSent: BigInt(195430200),
        isConnected: true,
        endpoint: '197.210.8.92:58190',
      },
      {
        id: 'prof-fp-003',
        name: 'Akpan Blessing Effiong',
        studentId: 'FP/ND/SLT/22/104',
        department: 'Science Laboratory Technology',
        email: 'blessing.akpan@foundationpoly.edu.ng',
        phone: '+234 902 334 7820',
        description: 'Microbiology Research Database Access',
        vpnIp: '10.8.0.4',
        publicKey: 'qR7sT8uV9wX0yZ1a2B3cD4eF5gH6iJ7kL8mN9oP0qR1=',
        privateKey: null,
        status: 'ACTIVE',
        createdAt: yesterday,
        updatedAt: tenMinsAgo,
        lastHandshake: tenMinsAgo,
        bytesReceived: BigInt(320140500),
        bytesSent: BigInt(84120300),
        isConnected: true,
        endpoint: '102.89.34.12:49320',
      },
      {
        id: 'prof-fp-004',
        name: 'Dr. Archibong Kufre Idiong',
        studentId: 'STAFF/FP/ICT/007',
        department: 'ICT & Academic Computing Directorate',
        email: 'k.archibong@foundationpoly.edu.ng',
        phone: '+234 802 889 1245',
        description: 'Systems Administrator - Campus Core Network',
        vpnIp: '10.8.0.5',
        publicKey: 'zX1c2V3b4N5m6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T1=',
        privateKey: null,
        status: 'ACTIVE',
        createdAt: threeDaysAgo,
        updatedAt: new Date(),
        lastHandshake: new Date(),
        bytesReceived: BigInt(890430120),
        bytesSent: BigInt(412530900),
        isConnected: true,
        endpoint: '105.112.98.54:52110',
      },
      {
        id: 'prof-fp-005',
        name: 'Etukudo Samuel Friday',
        studentId: 'FP/ND/ACC/22/073',
        department: 'Accountancy',
        email: 'samuel.etukudo@foundationpoly.edu.ng',
        phone: '+234 703 118 4590',
        description: 'Bursary Department Portal Access',
        vpnIp: '10.8.0.6',
        publicKey: 'mN1bV2cX3zA4sD5fG6hJ7kL8pO9iU0yT1rE2wQ3a4S5=',
        privateKey: null,
        status: 'DISABLED',
        createdAt: threeDaysAgo,
        updatedAt: yesterday,
        lastHandshake: yesterday,
        bytesReceived: BigInt(45012030),
        bytesSent: BigInt(12045000),
        isConnected: false,
        endpoint: null,
      },
      {
        id: 'prof-fp-006',
        name: 'Umanah Mfonobong Patrick',
        studentId: 'FP/HND/BAM/23/055',
        department: 'Business Administration & Management',
        email: 'mfon.umanah@foundationpoly.edu.ng',
        phone: '+234 813 902 4471',
        description: 'Post-Graduation Clearance - Access Terminated',
        vpnIp: '10.8.0.7',
        publicKey: 'bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4zA5bC6d=',
        privateKey: null,
        status: 'REVOKED',
        createdAt: threeDaysAgo,
        updatedAt: yesterday,
        revokedAt: yesterday,
        lastHandshake: null,
        bytesReceived: BigInt(10450000),
        bytesSent: BigInt(3410000),
        isConnected: false,
        endpoint: null,
      },
    ];

    for (const p of initialProfiles) {
      const createdProfile = await prisma.vpnProfile.create({ data: p });

      // Create initial traffic snapshots for the profile
      const hours = [24, 18, 12, 6, 1];
      for (let i = 0; i < hours.length; i++) {
        const h = hours[i];
        await prisma.trafficSnapshot.create({
          data: {
            vpnProfileId: createdProfile.id,
            bytesReceived: BigInt(Math.floor(Number(p.bytesReceived) * (0.2 * (i + 1)))),
            bytesSent: BigInt(Math.floor(Number(p.bytesSent) * (0.2 * (i + 1)))),
            timestamp: new Date(Date.now() - h * 3600 * 1000),
          },
        });
      }
    }
    console.log(`[Seed:Profiles] Created ${initialProfiles.length} sample institutional profiles.`);
  } else {
    console.log(`[Seed:Profiles] Database already contains ${profileCount} VPN profiles. Skipping profile seed.`);
  }

  // 3. Seed Initial Audit Logs (if empty)
  const auditCount = await prisma.auditLog.count();
  if (auditCount <= 1) {
    console.log('[Seed:Audit] Seeding initial audit trail logs...');
    const initialLogs = [
      {
        action: 'VPN_CLIENT_CONNECTED',
        description: 'WireGuard handshake completed successfully from 105.112.45.18:41230',
        actor: 'SYSTEM',
        targetType: 'VPN_PROFILE',
        targetId: 'prof-fp-001',
        metadata: JSON.stringify({ ipAddress: '10.8.0.2', severity: 'success' }),
        createdAt: new Date(Date.now() - 4 * 60 * 1000),
      },
      {
        action: 'VPN_CLIENT_CONNECTED',
        description: 'Admin remote session tunnel verified on port 51820',
        actor: 'SYSTEM',
        targetType: 'VPN_PROFILE',
        targetId: 'prof-fp-004',
        metadata: JSON.stringify({ ipAddress: '10.8.0.5', severity: 'info' }),
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        action: 'VPN_CONFIG_GENERATED',
        description: 'WireGuard .conf file and mobile QR code dispatched to student',
        actor: admin.id,
        targetType: 'VPN_PROFILE',
        targetId: 'prof-fp-003',
        metadata: JSON.stringify({ ipAddress: '10.8.0.4', severity: 'info' }),
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        action: 'VPN_PROFILE_CREATED',
        description: 'VPN Profile authorized by Chief Security Officer for SLT department',
        actor: admin.id,
        targetType: 'VPN_PROFILE',
        targetId: 'prof-fp-003',
        metadata: JSON.stringify({ ipAddress: '10.8.0.4', severity: 'success' }),
        createdAt: new Date(Date.now() - 3 * 3600 * 1000),
      },
      {
        action: 'VPN_PROFILE_REVOKED',
        description: 'Revoked VPN peer entry upon graduation clearance certificate issuance',
        actor: admin.id,
        targetType: 'VPN_PROFILE',
        targetId: 'prof-fp-006',
        metadata: JSON.stringify({ ipAddress: '10.8.0.7', severity: 'warning' }),
        createdAt: new Date(Date.now() - 18 * 3600 * 1000),
      },
      {
        action: 'VPN_SERVER_STARTED',
        description: 'Foundation Polytechnic WireGuard VPN service started on Windows host (interface wg0:51820)',
        actor: admin.id,
        targetType: 'SERVER',
        targetId: 'wg0',
        metadata: JSON.stringify({ interface: 'wg0', port: 51820, severity: 'info' }),
        createdAt: new Date(Date.now() - 26 * 3600 * 1000),
      },
    ];

    for (const log of initialLogs) {
      await prisma.auditLog.create({ data: log });
    }
    console.log(`[Seed:Audit] Created ${initialLogs.length} initial audit records.`);
  }

  console.log('[Seed] Database initialization and idempotent seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
