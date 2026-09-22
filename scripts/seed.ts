/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * VPN Management Portal - Initial Administrator Seed Script
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { dbService } from '../server/services/db';

async function seed() {
  console.log('================================================================');
  console.log('FOUNDATION POLYTECHNIC - VPN MANAGEMENT PORTAL');
  console.log('Case Study: Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria');
  console.log('Seeding Initial Administrator Account...');
  console.log('================================================================');

  const admin = await dbService.seedInitialAdmin();
  console.log(`[Seed] Successfully synchronized administrator:`);
  console.log(`  ID:    ${admin.id}`);
  console.log(`  Name:  ${admin.name}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role:  ${admin.role}`);
  console.log('[Seed] Password was securely hashed with bcrypt. Ready for authentication.');
}

seed().catch((err) => {
  console.error('[Seed Error] Failed to seed administrator account:', err);
  process.exit(1);
});
