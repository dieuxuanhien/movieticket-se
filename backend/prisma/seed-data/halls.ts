import { HallType } from '@prisma/client';

export const halls = [
  // Hanoi - CGV Vincom
  { cinemaIndex: 0, name: 'Hall 1', type: HallType.STANDARD, capacity: 120 },
  { cinemaIndex: 0, name: 'Hall 2', type: HallType.VIP, capacity: 80 },
  { cinemaIndex: 0, name: 'Hall 3', type: HallType.IMAX, capacity: 200 },
  
  // Hanoi - CGV Aeon Mall
  { cinemaIndex: 1, name: 'Hall 1', type: HallType.STANDARD, capacity: 100 },
  { cinemaIndex: 1, name: 'Hall 2', type: HallType.STANDARD, capacity: 100 },
  
  // HCM - Lotte Landmark
  { cinemaIndex: 2, name: 'Hall 1', type: HallType.IMAX, capacity: 250 },
  { cinemaIndex: 2, name: 'Hall 2', type: HallType.VIP, capacity: 90 },
  { cinemaIndex: 2, name: 'Hall 3', type: HallType.STANDARD, capacity: 150 },
  
  // HCM - Galaxy
  { cinemaIndex: 3, name: 'Hall 1', type: HallType.STANDARD, capacity: 120 },
  { cinemaIndex: 3, name: 'Hall 2', type: HallType.STANDARD, capacity: 120 },
  
  // HCM - BHD Star
  { cinemaIndex: 4, name: 'Hall 1', type: HallType.VIP, capacity: 100 },
  { cinemaIndex: 4, name: 'Hall 2', type: HallType.STANDARD, capacity: 130 },
  
  // Da Nang
  { cinemaIndex: 5, name: 'Hall 1', type: HallType.STANDARD, capacity: 110 },
  { cinemaIndex: 5, name: 'Hall 2', type: HallType.IMAX, capacity: 180 },
];
