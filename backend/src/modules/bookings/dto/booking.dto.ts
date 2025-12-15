import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== REQUEST DTOs ====================

export class LockSeatsDto {
  @ApiProperty({
    description: 'Showtime ID',
    example: 'uuid-of-showtime',
  })
  @IsString()
  showtimeId: string;

  @ApiProperty({
    description: 'Array of seat IDs to lock',
    example: ['uuid-seat-1', 'uuid-seat-2'],
  })
  @IsArray()
  @IsString({ each: true })
  seatIds: string[];
}

export class ConcessionItemDto {
  @ApiProperty({
    description: 'Concession item ID',
    example: 'uuid-of-concession',
  })
  @IsString()
  concessionId: string;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * CreateBookingDto
 *
 * Flow:
 * 1. User locks seats via POST /bookings/lock
 * 2. User creates booking - seats are fetched from user's SeatLock records
 * 3. Booking is created with PENDING status
 * 4. Returns booking summary with breakdown
 * 5. User clicks "Pay" -> calls POST /bookings/:id/payment to get VNPAY URL
 */
export class CreateBookingDto {
  @ApiProperty({
    description: 'Showtime ID',
    example: 'uuid-of-showtime',
  })
  @IsString()
  showtimeId: string;

  @ApiPropertyOptional({
    type: [ConcessionItemDto],
    description: 'Optional concession items',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConcessionItemDto)
  concessions?: ConcessionItemDto[];
}

export class CreatePaymentDto {
  @ApiPropertyOptional({
    description: 'Return URL after payment (frontend URL)',
    example: 'https://yourapp.com/booking/result',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

// ==================== RESPONSE DTOs ====================

export class SeatInfoDto {
  @ApiProperty() seatId: string;
  @ApiProperty() row: string;
  @ApiProperty() number: number;
  @ApiProperty() seatType: string;
  @ApiProperty() price: number;
}

export class ConcessionInfoDto {
  @ApiProperty() concessionId: string;
  @ApiProperty() name: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() totalPrice: number;
}

export class MovieInfoDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() posterUrl?: string;
  @ApiProperty() runtime: number;
  @ApiProperty() ageRating: string;
}

export class CinemaInfoDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiProperty() hallName: string;
}

export class ShowtimeInfoDto {
  @ApiProperty() id: string;
  @ApiProperty() startTime: Date;
  @ApiProperty() endTime: Date;
  @ApiProperty() format: string;
}

export class PricingBreakdownDto {
  @ApiProperty() ticketsSubtotal: number;
  @ApiProperty() concessionsSubtotal: number;
  @ApiProperty() subtotal: number;
  @ApiProperty() finalAmount: number;
}

export class PaymentInfoDto {
  @ApiPropertyOptional() id?: string;
  @ApiProperty() amount: number;
  @ApiPropertyOptional() paymentMethod?: string;
  @ApiPropertyOptional() paymentUrl?: string;
  @ApiProperty() status: string;
}

/**
 * BookingSummaryDto - Returned after createBooking
 * Contains full breakdown of the booking before payment
 */
export class BookingSummaryDto {
  @ApiProperty() bookingId: string;
  @ApiProperty() bookingCode: string;
  @ApiProperty() status: string;
  @ApiProperty() expiresAt: Date;

  @ApiProperty({ type: MovieInfoDto })
  movie: MovieInfoDto;

  @ApiProperty({ type: CinemaInfoDto })
  cinema: CinemaInfoDto;

  @ApiProperty({ type: ShowtimeInfoDto })
  showtime: ShowtimeInfoDto;

  @ApiProperty({ type: [SeatInfoDto] })
  seats: SeatInfoDto[];

  @ApiProperty({ type: [ConcessionInfoDto] })
  concessions: ConcessionInfoDto[];

  @ApiProperty({ type: PricingBreakdownDto })
  pricing: PricingBreakdownDto;

  @ApiPropertyOptional({ type: PaymentInfoDto })
  payment?: PaymentInfoDto;

  @ApiProperty() createdAt: Date;
}

/**
 * PaymentUrlResponseDto - Returned after creating payment URL
 */
export class PaymentUrlResponseDto {
  @ApiProperty({
    description: 'Payment URL to redirect user to VNPAY',
    example: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Booking code',
    example: 'BK1234567890',
  })
  bookingCode: string;

  @ApiProperty({
    description: 'Payment expiration time',
  })
  expiresAt: Date;
}

/**
 * VNPayReturnDto - Query params from VNPAY return URL
 */
export class VNPayReturnDto {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}

/**
 * VNPayIPNResponseDto - Response format for VNPAY IPN
 */
export class VNPayIPNResponseDto {
  @ApiProperty({ example: '00' })
  RspCode: string;

  @ApiProperty({ example: 'Success' })
  Message: string;
}

/**
 * SeatLockResponseDto - Response after locking seats
 */
export class SeatLockResponseDto {
  @ApiProperty() message: string;
  @ApiProperty() locks: any[];
  @ApiProperty() expiresAt: Date;
  @ApiProperty() lockDurationMinutes: number;
}
