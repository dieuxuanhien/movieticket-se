/**
 * ⚠️  DEPRECATED - This script has been merged into seed.ts
 * 
 * Use the unified seed.ts instead:
 *   npm run seed
 * 
 * The unified script handles:
 *   1. Database seeding (genres, cinemas, halls, seats, movies, showtimes, concessions)
 *   2. Clerk user creation (users with roles and cinema assignments)
 * 
 * This file is kept for reference only and should not be used.
 * 
 * Legacy: Clerk User Seeding Script
 * This script creates users directly in Clerk with metadata (role, cinemaId, etc.)
 * Run this AFTER seeding your database with cinemas, so you can assign cinema IDs to managers/staff.
 * 
 * Usage (DEPRECATED):
 *   npx ts-node prisma/seed-clerk-users.ts
 * 
 * Environment Requirements:
 *   - CLERK_SECRET_KEY must be set in your .env file
 */

import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

interface UserSeedData {
  email: string;
  fullName: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'USER';
  cinemaId: string | null;
  password?: string;
}

const DEFAULT_PASSWORD = 'Password123!';

async function createClerkUser(userData: UserSeedData) {
  const { email, fullName, phone, role, cinemaId, password } = userData;

  // Parse full name into first and last name
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  try {
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password: password || DEFAULT_PASSWORD,
      firstName,
      lastName,
      phoneNumber: phone ? [phone] : undefined,
      publicMetadata: {
        role,
        cinemaId,
        phone,
        fullName,
      },
      skipPasswordChecks: true,
      skipPasswordRequirement: false,
    });

    console.log(`✓ Created Clerk user: ${email} (${role})`);
    return user;
  } catch (error: any) {
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      console.warn(`⚠️  User ${email} already exists in Clerk, skipping...`);
      return null;
    }
    console.error(`❌ Failed to create user ${email}:`, error.errors || error);
    throw error;
  }
}

async function deleteAllClerkUsers() {
  console.log('🧹 Deleting all existing Clerk users...');
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const userList = await clerkClient.users.getUserList({ limit: 100 });

    for (const user of userList.data) {
      try {
        await clerkClient.users.deleteUser(user.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }

    hasMore = userList.data.length === 100;
  }

  console.log(`✓ Deleted ${deletedCount} users from Clerk\n`);
}

async function main() {
  console.log('🌱 Starting Clerk user seeding...\n');

  // Check if Clerk secret key is set
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error(
      'CLERK_SECRET_KEY environment variable is not set. Please add it to your .env file.',
    );
  }

  try {
    // Optional: Clean up existing users (uncomment if you want a fresh start)
    // await deleteAllClerkUsers();

    // Fetch cinemas from database to assign to managers/staff
    const cinemas = await prisma.cinema.findMany({
      orderBy: { name: 'asc' },
    });

    if (cinemas.length === 0) {
      console.warn(
        '⚠️  No cinemas found in database. Run main seed script first: npm run seed',
      );
      console.warn(
        '   Continuing with null cinemaId for managers and staff...\n',
      );
    } else {
      console.log(`📍 Found ${cinemas.length} cinemas in database\n`);
    }

    // Define users to seed
    const users: UserSeedData[] = [
      {
        email: 'admin@movieticket.com',
        fullName: 'System Admin',
        phone: '0901234567',
        role: 'ADMIN',
        cinemaId: null,
      },
      {
        email: 'manager.hanoi@movieticket.com',
        fullName: 'Nguyen Van Manager',
        phone: '0902345678',
        role: 'MANAGER',
        cinemaId: cinemas[0]?.id || null, // First cinema
      },
      {
        email: 'manager.hcm@movieticket.com',
        fullName: 'Tran Thi Manager',
        phone: '0903456789',
        role: 'MANAGER',
        cinemaId: cinemas[2]?.id || null, // Third cinema
      },
      {
        email: 'staff1@movieticket.com',
        fullName: 'Le Van Staff',
        phone: '0904567890',
        role: 'STAFF',
        cinemaId: cinemas[0]?.id || null, // First cinema
      },
      {
        email: 'staff2@movieticket.com',
        fullName: 'Pham Thi Staff',
        phone: '0905678901',
        role: 'STAFF',
        cinemaId: cinemas[2]?.id || null, // Third cinema
      },
      {
        email: 'user1@example.com',
        fullName: 'Hoang Van User',
        phone: '0906789012',
        role: 'USER',
        cinemaId: null,
      },
      {
        email: 'user2@example.com',
        fullName: 'Vo Thi User',
        phone: '0907890123',
        role: 'USER',
        cinemaId: null,
      },
    ];

    console.log('👥 Creating users in Clerk...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const userData of users) {
      try {
        const result = await createClerkUser(userData);
        if (result) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    console.log('\n✅ Clerk user seeding completed! 🎉\n');
    console.log('📊 Summary:');
    console.log(`   - Created: ${successCount} users`);
    console.log(`   - Skipped: ${skipCount} users (already exist)`);
    console.log(`   - Failed: ${errorCount} users`);
    console.log(`\n💡 Default password for all seeded users: ${DEFAULT_PASSWORD}`);
    console.log('   Change passwords in Clerk Dashboard or via user update API\n');

    console.log('📝 User roles and cinema assignments:');
    for (const user of users) {
      const cinemaName = user.cinemaId
        ? cinemas.find((c) => c.id === user.cinemaId)?.name || 'Unknown'
        : 'N/A';
      console.log(
        `   - ${user.email.padEnd(35)} | ${user.role.padEnd(7)} | ${cinemaName}`,
      );
    }
  } catch (error) {
    console.error('❌ Error during Clerk user seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
