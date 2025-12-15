import { SystemStatus } from '@prisma/client';

export const cinemas = [
  {
    name: 'CGV Vincom Hanoi',
    address: '191 Ba Trieu, Hai Ba Trung',
    city: 'Hanoi',
    status: SystemStatus.ACTIVE,
  },
  {
    name: 'CGV Aeon Mall Long Bien',
    address: '27 Co Linh, Long Bien',
    city: 'Hanoi',
    status: SystemStatus.ACTIVE,
  },
  {
    name: 'Lotte Cinema Landmark 81',
    address: '208 Nguyen Huu Canh, Binh Thanh',
    city: 'Ho Chi Minh',
    status: SystemStatus.ACTIVE,
  },
  {
    name: 'Galaxy Nguyen Du',
    address: '116 Nguyen Du, District 1',
    city: 'Ho Chi Minh',
    status: SystemStatus.ACTIVE,
  },
  {
    name: 'BHD Star Bitexco',
    address: '2 Hai Trieu, District 1',
    city: 'Ho Chi Minh',
    status: SystemStatus.ACTIVE,
  },
  {
    name: 'CGV Vincom Da Nang',
    address: '910-912 Ngo Quyen, Hai Chau',
    city: 'Da Nang',
    status: SystemStatus.ACTIVE,
  },
];
