import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import { ConfigService } from '../../config/config.service';
import { VnpayService, IpnResponse, VNPayVerifyResult } from './vnpay.service';
import { CreatePaymentDto, PaymentUrlResponseDto } from './dto/booking.dto';
import { PaymentMethod } from '../../common/constants/app.constants';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly configService: ConfigService,
    private readonly vnpayService: VnpayService,
  ) {
    this.logger = new CustomLoggerService(PaymentService.name);
  }

  /**
   * Create a payment URL for a booking
   * Called when user clicks "Pay" after reviewing booking summary
   */
  async createPaymentUrl(
    bookingId: string,
    userId: string,
    dto: CreatePaymentDto,
    ipAddr: string,
  ): Promise<PaymentUrlResponseDto> {
    this.logger.logPayment('Creating payment URL', { bookingId, userId });

    // Get booking and verify ownership
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        showtime: { include: { movie: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('You can only pay for your own bookings');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot create payment for booking with status ${booking.status}`,
      );
    }

    // Check if booking has expired
    if (booking.expiresAt && new Date(booking.expiresAt) < new Date()) {
      throw new BadRequestException(
        'Booking has expired. Please create a new booking.',
      );
    }

    // Check if payment already exists and is not failed
    if (booking.payment && booking.payment.status !== 'FAILED') {
      // Return existing payment URL if still valid
      if (booking.payment.paymentUrl) {
        return {
          paymentUrl: booking.payment.paymentUrl,
          bookingCode: booking.bookingCode,
          expiresAt: booking.expiresAt,
        };
      }
    }

    // Build return URL (frontend URL where user is redirected after payment)
    const returnUrl =
      dto.returnUrl ||
      `${this.configService.frontendUrl}/booking/result?bookingCode=${booking.bookingCode}`;

    // Build VNPAY payment URL
    const paymentUrl = this.vnpayService.buildPaymentUrl({
      amount: Number(booking.finalAmount),
      orderInfo: `Thanh toan ve xem phim ${booking.showtime.movie.title}`,
      txnRef: booking.bookingCode,
      ipAddr,
      returnUrl,
      bookingExpiresAt: booking.expiresAt,
    });

    // Create or update payment record
    const payment = await this.prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: booking.finalAmount,
        paymentMethod: PaymentMethod.VNPAY,
        status: 'PENDING',
        vnpTxnRef: booking.bookingCode,
        paymentUrl,
      },
      update: {
        paymentMethod: PaymentMethod.VNPAY,
        status: 'PENDING',
        vnpTxnRef: booking.bookingCode,
        paymentUrl,
      },
    });

    this.logger.logPayment('Payment URL created', {
      bookingId,
      paymentId: payment.id,
      bookingCode: booking.bookingCode,
    });

    return {
      paymentUrl,
      bookingCode: booking.bookingCode,
      expiresAt: booking.expiresAt,
    };
  }

  /**
   * Handle VNPAY IPN (Instant Payment Notification)
   * This is called by VNPAY server to notify payment status
   * MUST return { RspCode, Message } format
   */
  async handleVnpayIpn(
    vnpParams: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    this.logger.logPayment('Received VNPAY IPN', {
      txnRef: vnpParams.vnp_TxnRef,
      responseCode: vnpParams.vnp_ResponseCode,
    });

    // Verify the IPN data
    const verifyResult = this.vnpayService.verifyIpnCall(vnpParams);

    if (!verifyResult.isVerified) {
      this.logger.logPayment('VNPAY IPN checksum failed', {
        txnRef: vnpParams.vnp_TxnRef,
      });
      return IpnResponse.CHECKSUM_FAILED;
    }

    // Find booking by booking code (txnRef)
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: verifyResult.vnp_TxnRef },
      include: { payment: true },
    });

    if (!booking) {
      this.logger.logPayment('Booking not found for IPN', {
        txnRef: verifyResult.vnp_TxnRef,
      });
      return IpnResponse.ORDER_NOT_FOUND;
    }

    // Check if already confirmed
    if (booking.status === 'CONFIRMED') {
      return IpnResponse.ORDER_ALREADY_CONFIRMED;
    }

    // Verify amount
    if (verifyResult.vnp_Amount !== Number(booking.finalAmount)) {
      this.logger.logPayment('Amount mismatch', {
        expected: booking.finalAmount,
        received: verifyResult.vnp_Amount,
      });
      return IpnResponse.INVALID_AMOUNT;
    }

    try {
      if (verifyResult.isSuccess) {
        // Payment successful
        await this.handleSuccessfulPayment(booking.id, verifyResult);
        this.logger.logPayment('Payment successful', {
          bookingId: booking.id,
          transactionNo: verifyResult.vnp_TransactionNo,
        });
      } else {
        // Payment failed
        await this.handleFailedPayment(booking.id, verifyResult);
        this.logger.logPayment('Payment failed', {
          bookingId: booking.id,
          responseCode: verifyResult.vnp_ResponseCode,
          message: verifyResult.message,
        });
      }

      return IpnResponse.SUCCESS;
    } catch (error) {
      this.logger.error('Error processing IPN', error);
      return IpnResponse.UNKNOWN_ERROR;
    }
  }

  /**
   * Handle VNPAY return URL (user redirected back after payment)
   */
  async handleVnpayReturn(vnpParams: Record<string, string>): Promise<{
    success: boolean;
    message: string;
    bookingCode: string;
    booking?: any;
  }> {
    this.logger.logPayment('VNPAY return', {
      txnRef: vnpParams.vnp_TxnRef,
      responseCode: vnpParams.vnp_ResponseCode,
    });

    const verifyResult = this.vnpayService.verifyReturnUrl(vnpParams);

    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: verifyResult.vnp_TxnRef },
      include: {
        showtime: { include: { movie: true, cinema: true, hall: true } },
        tickets: { include: { seat: true } },
        payment: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        bookingCode: verifyResult.vnp_TxnRef,
      };
    }

    if (!verifyResult.isVerified) {
      return {
        success: false,
        message: 'Invalid signature',
        bookingCode: verifyResult.vnp_TxnRef,
        booking,
      };
    }

    return {
      success: verifyResult.isSuccess,
      message: verifyResult.message,
      bookingCode: verifyResult.vnp_TxnRef,
      booking,
    };
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(
    bookingId: string,
    verifyResult: VNPayVerifyResult,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Get booking with seat locks
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          tickets: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Get seat locks for this booking to create tickets
      const seatLocks = await tx.seatLock.findMany({
        where: {
          showtimeId: booking.showtimeId,
          userId: booking.userId,
        },
        include: {
          seat: true,
        },
      });

      if (seatLocks.length === 0) {
        throw new BadRequestException('No seat locks found for this booking');
      }

      // Get pricing for the showtime
      const showtime = await tx.showtime.findUnique({
        where: { id: booking.showtimeId },
        include: { pricing: true },
      });

      if (!showtime) {
        throw new NotFoundException('Showtime not found');
      }

      // Create price map
      const priceMap = new Map(
        showtime.pricing.map((p) => [p.seatType, Number(p.price)]),
      );

      // Create tickets from seat locks
      await tx.ticket.createMany({
        data: seatLocks.map((lock) => ({
          bookingId: booking.id,
          seatId: lock.seatId,
          showtimeId: booking.showtimeId,
          price: priceMap.get(lock.seat.type) || 0,
        })),
      });

      // Update payment record
      await tx.payment.update({
        where: { bookingId },
        data: {
          status: 'COMPLETED',
          vnpTransactionNo: verifyResult.vnp_TransactionNo,
          vnpBankCode: verifyResult.vnp_BankCode,
          vnpBankTranNo: verifyResult.vnp_BankTranNo,
          vnpPayDate: verifyResult.vnp_PayDate,
          vnpResponseCode: verifyResult.vnp_ResponseCode,
          completedAt: new Date(),
        },
      });

      // Confirm the booking
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Remove seat locks after tickets are created
      await tx.seatLock.deleteMany({
        where: {
          showtimeId: booking.showtimeId,
          seatId: { in: seatLocks.map((lock) => lock.seatId) },
        },
      });
    });
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(
    bookingId: string,
    verifyResult: VNPayVerifyResult,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { bookingId },
      data: {
        status: 'FAILED',
        vnpResponseCode: verifyResult.vnp_ResponseCode,
      },
    });

    // Note: We don't cancel the booking immediately on failed payment
    // User can try again until the booking expires
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(bookingId: string, userId: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException(
        'You can only view payments for your own bookings',
      );
    }

    return booking.payment;
  }
}
