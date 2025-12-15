import { UserRole } from '@prisma/client';

export const users = [
  {
    email: 'admin@movieticket.com',
    fullName: 'System Admin',
    phone: '0901234567',
    role: UserRole.ADMIN,
    cinemaId: null,
  },
  {
    email: 'manager.hanoi@movieticket.com',
    fullName: 'Nguyen Van Manager',
    phone: '0902345678',
    role: UserRole.MANAGER,
    cinemaId: null, // Will be assigned after cinema creation
  },
  {
    email: 'manager.hcm@movieticket.com',
    fullName: 'Tran Thi Manager',
    phone: '0903456789',
    role: UserRole.MANAGER,
    cinemaId: null, // Will be assigned after cinema creation
  },
  {
    email: 'staff1@movieticket.com',
    fullName: 'Le Van Staff',
    phone: '0904567890',
    role: UserRole.STAFF,
    cinemaId: null, // Will be assigned after cinema creation
  },
  {
    email: 'staff2@movieticket.com',
    fullName: 'Pham Thi Staff',
    phone: '0905678901',
    role: UserRole.STAFF,
    cinemaId: null, // Will be assigned after cinema creation
  },
  {
    email: 'user1@example.com',
    fullName: 'Hoang Van User',
    phone: '0906789012',
    role: UserRole.USER,
    cinemaId: null,
  },
  {
    email: 'user2@example.com',
    fullName: 'Vo Thi User',
    phone: '0907890123',
    role: UserRole.USER,
    cinemaId: null,
  },
];
