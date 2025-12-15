// User roles matching schema.prisma
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  USER = 'USER',
}

// Booking status matching schema.prisma
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

// Payment status matching schema.prisma
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// Payment methods matching schema.prisma
export enum PaymentMethod {
  VNPAY = 'VNPAY',
  CREDIT_CARD = 'CREDIT_CARD',
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
}

// System status matching schema.prisma
export enum SystemStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  CLOSED = 'CLOSED',
}

// Hall type matching schema.prisma
export enum HallType {
  STANDARD = 'STANDARD',
  IMAX = 'IMAX',
  VIP = 'VIP',
}

// Seat type matching schema.prisma
export enum SeatType {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
  COUPLE = 'COUPLE',
}

// Movie format matching schema.prisma
export enum MovieFormat {
  TWO_D = 'TWO_D',
  THREE_D = 'THREE_D',
  IMAX = 'IMAX',
}

// Age rating matching schema.prisma
export enum AgeRating {
  P = 'P',
  T13 = 'T13',
  T16 = 'T16',
  T18 = 'T18',
}
