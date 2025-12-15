import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import { ConfigService } from '../../config/config.service';
import {
  CreateBookingDto,
  BookingSummaryDto,
  SeatInfoDto,
  ConcessionInfoDto,
} from './dto/booking.dto';
import { nanoid } from 'nanoid';
import { PaymentStatus } from '../../common/constants/app.constants';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger = new CustomLoggerService(BookingsService.name);
  }

  /**
   * Create a booking from user's locked seats
   */
  async createBooking(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingSummaryDto> {
    const { showtimeId, concessions } = createBookingDto;
    this.logger.logBooking('Creating booking', { userId, showtimeId });

    // Validate showtime
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        cinema: true,
        hall: true,
        pricing: true,
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    if (new Date(showtime.startTime) < new Date()) {
      throw new BadRequestException('Cannot book past showtimes');
    }

    // Get user's locked seats
    const lockedSeats = await this.prisma.seatLock.findMany({
      where: {
        showtimeId,
        userId,
        expiresAt: { gt: new Date() },
      },
      include: { seat: true },
    });

    if (lockedSeats.length === 0) {
      throw new BadRequestException(
        'You have no locked seats for this showtime. Please select seats first.',
      );
    }

    // Calculate ticket prices
    const priceMap = new Map(
      showtime.pricing.map((p) => [p.seatType, Number(p.price)]),
    );
    let ticketTotal = 0;
    const ticketData: { seatId: string; price: number; seat: any }[] = [];

    for (const lock of lockedSeats) {
      const price = priceMap.get(lock.seat.type);
      if (!price) {
        throw new BadRequestException(
          `No pricing found for seat type ${lock.seat.type}`,
        );
      }
      ticketTotal += price;
      ticketData.push({ seatId: lock.seatId, price, seat: lock.seat });
    }

    // Calculate concession prices
    let concessionTotal = 0;
    const concessionData: {
      concessionId: string;
      quantity: number;
      totalPrice: number;
      name: string;
      unitPrice: number;
    }[] = [];

    if (concessions && concessions.length > 0) {
      const concessionItems = await this.prisma.concession.findMany({
        where: { id: { in: concessions.map((c) => c.concessionId) } },
      });

      const concessionPriceMap = new Map(
        concessionItems.map((c) => [
          c.id,
          { price: Number(c.price), name: c.name },
        ]),
      );

      for (const c of concessions) {
        const item = concessionPriceMap.get(c.concessionId);
        if (!item) {
          throw new BadRequestException(
            `Concession item not found: ${c.concessionId}`,
          );
        }
        const total = item.price * c.quantity;
        concessionTotal += total;
        concessionData.push({
          concessionId: c.concessionId,
          quantity: c.quantity,
          totalPrice: total,
          name: item.name,
          unitPrice: item.price,
        });
      }
    }

    const finalAmount = ticketTotal + concessionTotal;
    const bookingCode = `BK${nanoid(10).toUpperCase()}`;
    // Set booking expiration to the earliest seat lock expiration time
    const expiresAt = lockedSeats.reduce(
      (earliest, lock) =>
        lock.expiresAt < earliest ? lock.expiresAt : earliest,
      lockedSeats[0]?.expiresAt,
    );

    // Create booking in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          showtimeId,
          finalAmount,
          status: 'PENDING',
          expiresAt,
        },
      });

      await tx.ticket.createMany({
        data: ticketData.map((t) => ({
          bookingId: newBooking.id,
          seatId: t.seatId,
          showtimeId,
          price: t.price,
        })),
      });

      if (concessionData.length > 0) {
        await tx.bookingConcession.createMany({
          data: concessionData.map((c) => ({
            bookingId: newBooking.id,
            concessionId: c.concessionId,
            quantity: c.quantity,
            totalPrice: c.totalPrice,
          })),
        });
      }

      return newBooking;
    });

    this.logger.logBooking('Booking created', {
      bookingId: booking.id,
      bookingCode,
      finalAmount,
    });

    // Build response
    const seats: SeatInfoDto[] = ticketData.map((t) => ({
      seatId: t.seatId,
      row: t.seat.rowLetter,
      number: t.seat.seatNumber,
      seatType: t.seat.type,
      price: t.price,
    }));

    const concessionsSummary: ConcessionInfoDto[] = concessionData.map((c) => ({
      concessionId: c.concessionId,
      name: c.name,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      totalPrice: c.totalPrice,
    }));

    return {
      bookingId: booking.id,
      bookingCode,
      status: booking.status,
      expiresAt: booking.expiresAt,
      movie: {
        id: showtime.movie.id,
        title: showtime.movie.title,
        posterUrl: showtime.movie.posterUrl,
        runtime: showtime.movie.runtime,
        ageRating: showtime.movie.ageRating,
      },
      cinema: {
        id: showtime.cinema.id,
        name: showtime.cinema.name,
        address: showtime.cinema.address,
        hallName: showtime.hall.name,
      },
      showtime: {
        id: showtime.id,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        format: showtime.format,
      },
      seats,
      concessions: concessionsSummary,
      pricing: {
        ticketsSubtotal: ticketTotal,
        concessionsSubtotal: concessionTotal,
        subtotal: finalAmount,
        finalAmount,
      },
      payment: {
        amount: finalAmount,
        status: PaymentStatus.PENDING,
      },
      createdAt: booking.createdAt,
    };
  }

  async getBookingById(id: string, userId?: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        showtime: {
          include: { movie: true, cinema: true, hall: true },
        },
        tickets: { include: { seat: true } },
        concessions: { include: { concession: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userId && booking.userId !== userId) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return booking;
  }

  async getBookingByCode(bookingCode: string, userId?: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        showtime: {
          include: { movie: true, cinema: true, hall: true },
        },
        tickets: { include: { seat: true } },
        concessions: { include: { concession: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userId && booking.userId !== userId) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return booking;
  }

  async getUserBookings(userId: string, status?: string): Promise<any[]> {
    const where: any = { userId };
    if (status) where.status = status;

    return this.prisma.booking.findMany({
      where,
      include: {
        showtime: {
          include: { movie: true, cinema: true, hall: true },
        },
        tickets: { include: { seat: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelBooking(id: string, userId: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { showtime: true, tickets: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (
      booking.status === 'CONFIRMED' &&
      new Date(booking.showtime.startTime) < new Date()
    ) {
      throw new BadRequestException(
        'Cannot cancel booking after showtime has started',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.ticket.deleteMany({ where: { bookingId: id } });

      const seatIds = booking.tickets.map((t) => t.seatId);
      if (seatIds.length > 0) {
        await tx.seatLock.deleteMany({
          where: {
            showtimeId: booking.showtimeId,
            seatId: { in: seatIds },
            userId,
          },
        });
      }
    });

    this.logger.logBooking('Booking cancelled', { bookingId: id, userId });
    return { message: 'Booking cancelled successfully' };
  }

  async confirmBooking(bookingId: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tickets: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot confirm booking with status ${booking.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      const seatIds = booking.tickets.map((t) => t.seatId);
      await tx.seatLock.deleteMany({
        where: {
          showtimeId: booking.showtimeId,
          seatId: { in: seatIds },
        },
      });
    });

    this.logger.logBooking('Booking confirmed', { bookingId });
    return this.getBookingById(bookingId);
  }

  async expirePendingBookings(): Promise<{ expiredCount: number }> {
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      include: { tickets: true },
    });

    for (const booking of expiredBookings) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED' },
        });

        await tx.ticket.deleteMany({ where: { bookingId: booking.id } });

        const seatIds = booking.tickets.map((t) => t.seatId);
        if (seatIds.length > 0) {
          await tx.seatLock.deleteMany({
            where: {
              showtimeId: booking.showtimeId,
              seatId: { in: seatIds },
            },
          });
        }
      });
    }

    this.logger.logBooking('Expired bookings', {
      expiredCount: expiredBookings.length,
    });

    return { expiredCount: expiredBookings.length };
  }

  async getAllBookings(
    cinemaId?: string,
    status?: string,
    date?: string,
  ): Promise<any[]> {
    const where: any = {};

    if (cinemaId) where.showtime = { cinemaId };
    if (status) where.status = status;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        showtime: { include: { movie: true, cinema: true, hall: true } },
        tickets: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingsByShowtime(showtimeId: string): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: {
        showtimeId,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        tickets: { include: { seat: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
