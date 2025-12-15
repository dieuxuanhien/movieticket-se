import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import { ScanTicketDto } from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger = new CustomLoggerService(TicketsService.name);
  }

  async findById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        seat: true,
        showtime: {
          include: {
            movie: true,
            cinema: true,
            hall: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Scan ticket at cinema entry - Flow D from specification
   * Staff scans QR code, system validates and marks ticket as used
   */
  async scanTicket(scanTicketDto: ScanTicketDto, staffCinemaId: string) {
    const { ticketId, bookingCode } = scanTicketDto;

    this.logger.log('Scanning ticket', {
      ticketId,
      bookingCode,
      staffCinemaId,
    });

    let ticket;

    if (ticketId) {
      ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          booking: true,
          seat: true,
          showtime: {
            include: {
              movie: true,
              cinema: true,
              hall: true,
            },
          },
        },
      });
    } else if (bookingCode) {
      // Find ticket by booking code (first ticket of the booking)
      const booking = await this.prisma.booking.findUnique({
        where: { bookingCode },
        include: {
          tickets: {
            include: {
              seat: true,
              showtime: {
                include: {
                  movie: true,
                  cinema: true,
                  hall: true,
                },
              },
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Return all tickets for this booking
      return this.validateAndReturnBookingTickets(booking, staffCinemaId);
    }

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Validate ticket belongs to staff's cinema
    if (ticket.showtime.cinemaId !== staffCinemaId) {
      throw new ForbiddenException('This ticket is for a different cinema');
    }

    // Check booking status
    if (ticket.booking.status === 'CANCELLED') {
      throw new BadRequestException('This booking has been cancelled');
    }

    // Check if showtime is today
    const today = new Date();
    const showtimeDate = new Date(ticket.showtime.startTime);
    if (today.toDateString() !== showtimeDate.toDateString()) {
      throw new BadRequestException(
        `This ticket is for ${showtimeDate.toLocaleDateString()}, not today`,
      );
    }

    this.logger.log('Ticket validated successfully', {
      ticketId: ticket.id,
      movie: ticket.showtime.movie.title,
      seat: `${ticket.seat.rowLetter}${ticket.seat.seatNumber}`,
    });

    return {
      success: true,
      message: 'Welcome to the movie!',
      ticket: {
        id: ticket.id,
        seat: `${ticket.seat.rowLetter}${ticket.seat.seatNumber}`,
        movie: ticket.showtime.movie.title,
        hall: ticket.showtime.hall.name,
        startTime: ticket.showtime.startTime,
      },
    };
  }

  private async validateAndReturnBookingTickets(
    booking: any,
    staffCinemaId: string,
  ) {
    if (booking.tickets.length === 0) {
      throw new NotFoundException('No tickets found for this booking');
    }

    const firstTicket = booking.tickets[0];

    // Validate cinema
    if (firstTicket.showtime.cinemaId !== staffCinemaId) {
      throw new ForbiddenException('This booking is for a different cinema');
    }

    // Check booking status
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('This booking has been cancelled');
    }

    // Check if showtime is today
    const today = new Date();
    const showtimeDate = new Date(firstTicket.showtime.startTime);
    if (today.toDateString() !== showtimeDate.toDateString()) {
      throw new BadRequestException(
        `This booking is for ${showtimeDate.toLocaleDateString()}, not today`,
      );
    }

    return {
      success: true,
      message: 'Welcome to the movie!',
      booking: {
        code: booking.bookingCode,
        ticketCount: booking.tickets.length,
        movie: firstTicket.showtime.movie.title,
        hall: firstTicket.showtime.hall.name,
        startTime: firstTicket.showtime.startTime,
        seats: booking.tickets.map(
          (t: any) => `${t.seat.rowLetter}${t.seat.seatNumber}`,
        ),
      },
    };
  }

  async getTicketsByBooking(bookingId: string) {
    return this.prisma.ticket.findMany({
      where: { bookingId },
      include: {
        seat: true,
        showtime: {
          include: {
            movie: true,
            cinema: true,
            hall: true,
          },
        },
      },
    });
  }

  async getTicketsByShowtime(showtimeId: string) {
    return this.prisma.ticket.findMany({
      where: { showtimeId },
      include: {
        booking: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        seat: true,
      },
      orderBy: [
        { seat: { rowLetter: 'asc' } },
        { seat: { seatNumber: 'asc' } },
      ],
    });
  }
}
