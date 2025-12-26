/**
 * Users Seed Data
 *
 * This data is used to create users in Clerk during the unified seeding process.
 * Clerk manages all user authentication and metadata (role, cinemaId, phone, etc.)
 *
 * Note: cinemaId will be automatically assigned during seeding based on user role:
 * - ADMIN: no cinema assigned
 * - MANAGER/STAFF: assigned to cinemas during seeding based on index
 * - USER: no cinema assigned
 */

export interface UserSeedData {
  email: string;
  fullName: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'USER';
  cinemaId: null; // Will be assigned during seeding
}

export const users: UserSeedData[] = [
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
    cinemaId: null, // Assigned to first cinema during seeding
  },
  {
    email: 'manager.hcm@movieticket.com',
    fullName: 'Tran Thi Manager',
    phone: '0903456789',
    role: 'MANAGER',
    cinemaId: null, // Assigned to third cinema during seeding
  },
  {
    email: 'staff1@movieticket.com',
    fullName: 'Le Van Staff',
    phone: '0904567890',
    role: 'STAFF',
    cinemaId: null, // Assigned to first cinema during seeding
  },
  {
    email: 'staff2@movieticket.com',
    fullName: 'Pham Thi Staff',
    phone: '0905678901',
    role: 'STAFF',
    cinemaId: null, // Assigned to third cinema during seeding
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
