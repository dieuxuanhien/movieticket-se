import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { SeatLockService } from './seat-lock.service';
import { PaymentService } from './payment.service';
import {
  LockSeatsDto,
  CreateBookingDto,
  CreatePaymentDto,
} from './dto/booking.dto';
import { SupabaseGuard } from '../../common/guards/supabase.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { UserRole, BookingStatus } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly seatLockService: SeatLockService,
    private readonly paymentService: PaymentService,
  ) {}

  // ==================== SEAT LOCKING ====================

  @Post('lock')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lock seats for booking',
    description:
      'Step 1 of booking flow. Locks selected seats for the user. Timer begins after this.',
  })
  @ApiResponse({ status: 201, description: 'Seats locked successfully' })
  async lockSeats(
    @CurrentUserId() userId: string,
    @Body() lockSeatsDto: LockSeatsDto,
  ) {
    return this.seatLockService.lockSeats(userId, lockSeatsDto);
  }

  @Post('unlock')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Release locked seats' })
  @ApiResponse({ status: 200, description: 'Seats unlocked successfully' })
  async unlockSeats(
    @CurrentUserId() userId: string,
    @Body() lockSeatsDto: LockSeatsDto,
  ) {
    return this.seatLockService.unlockSeats(userId, lockSeatsDto);
  }

  @Get('locks/my')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my locked seats' })
  @ApiResponse({ status: 200, description: 'List of locked seats' })
  async getMyLocks(@CurrentUserId() userId: string) {
    return this.seatLockService.getUserLocks(userId);
  }

  // ==================== BOOKING CREATION ====================

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create booking',
    description:
      'Step 2 of booking flow. Creates a booking from locked seats. Returns booking summary for review.',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created with PENDING status',
  })
  async createBooking(
    @CurrentUserId() userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(userId, createBookingDto);
  }

  // ==================== PAYMENT ====================

  @Post(':id/payment')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create payment URL',
    description:
      'Step 3 of booking flow. Creates a VNPAY payment URL for the booking.',
  })
  @ApiResponse({ status: 201, description: 'Payment URL created' })
  async createPayment(
    @CurrentUserId() userId: string,
    @Param('id') bookingId: string,
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() request: Request,
  ) {
    const ipAddr =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      '127.0.0.1';

    return this.paymentService.createPaymentUrl(
      bookingId,
      userId,
      createPaymentDto,
      ipAddr,
    );
  }

  // ==================== VNPAY CALLBACKS ====================

  @Get('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'VNPAY IPN callback',
    description:
      'Called by VNPAY server to notify payment status. Returns { RspCode, Message }.',
  })
  @ApiResponse({ status: 200, description: 'IPN processed' })
  async vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentService.handleVnpayIpn(query);
  }

  @Get('vnpay/return')
  @ApiOperation({
    summary: 'VNPAY return URL',
    description: 'User is redirected here after payment on VNPAY.',
  })
  @ApiResponse({ status: 200, description: 'Payment result' })
  async vnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentService.handleVnpayReturn(query);
  }

  // ==================== USER BOOKINGS ====================

  @Get('my')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my bookings' })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiResponse({ status: 200, description: 'List of user bookings' })
  async getMyBookings(
    @CurrentUserId() userId: string,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingsService.getUserBookings(userId, status);
  }

  @Get(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  async getBooking(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.bookingsService.getBookingById(id, userId);
  }

  @Get('code/:bookingCode')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get booking by code' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  async getBookingByCode(
    @CurrentUserId() userId: string,
    @Param('bookingCode') bookingCode: string,
  ) {
    return this.bookingsService.getBookingByCode(bookingCode, userId);
  }

  @Post(':id/cancel')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancelBooking(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.bookingsService.cancelBooking(id, userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/all')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all bookings (Admin/Manager)' })
  @ApiQuery({ name: 'cinemaId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of all bookings' })
  async getAllBookings(
    @Query('cinemaId') cinemaId?: string,
    @Query('status') status?: BookingStatus,
    @Query('date') date?: string,
  ) {
    return this.bookingsService.getAllBookings(cinemaId, status, date);
  }

  @Get('admin/showtime/:showtimeId')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get bookings for a showtime' })
  @ApiResponse({ status: 200, description: 'List of bookings for showtime' })
  async getBookingsByShowtime(@Param('showtimeId') showtimeId: string) {
    return this.bookingsService.getBookingsByShowtime(showtimeId);
  }

  @Post('admin/expire')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Expire pending bookings (cron job trigger)' })
  @ApiResponse({ status: 200, description: 'Expired bookings count' })
  async expirePendingBookings() {
    return this.bookingsService.expirePendingBookings();
  }
}
