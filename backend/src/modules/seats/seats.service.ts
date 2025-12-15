import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UpdateSeatDto } from './dto/seat.dto';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      include: {
        hall: {
          include: { cinema: true },
        },
      },
    });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    return seat;
  }

  async update(id: string, updateSeatDto: UpdateSeatDto) {
    const seat = await this.prisma.seat.findUnique({ where: { id } });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    return this.prisma.seat.update({
      where: { id },
      data: updateSeatDto,
      include: {
        hall: true,
      },
    });
  }

  async getSeatsByShowtime(showtimeId: string) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: { hall: true },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    // Get all seats in the hall
    const seats = await this.prisma.seat.findMany({
      where: { hallId: showtime.hallId },
      orderBy: [{ rowLetter: 'asc' }, { seatNumber: 'asc' }],
    });

    // Get sold tickets for this showtime
    const soldTickets = await this.prisma.ticket.findMany({
      where: { showtimeId },
      select: { seatId: true },
    });
    const soldSeatIds = new Set(soldTickets.map((t) => t.seatId));

    // Get locked seats for this showtime
    const lockedSeats = await this.prisma.seatLock.findMany({
      where: {
        showtimeId,
        expiresAt: { gt: new Date() },
      },
      select: { seatId: true, userId: true, expiresAt: true },
    });
    const lockedSeatMap = new Map(lockedSeats.map((l) => [l.seatId, l]));

    // Get pricing for this showtime
    const pricing = await this.prisma.ticketPricing.findMany({
      where: { showtimeId },
    });
    const priceMap = new Map(pricing.map((p) => [p.seatType, p.price]));

    // Map seats with availability status
    const seatsWithStatus = seats.map((seat) => ({
      ...seat,
      price: priceMap.get(seat.type) || null,
      status: soldSeatIds.has(seat.id)
        ? 'SOLD'
        : lockedSeatMap.has(seat.id)
          ? 'LOCKED'
          : 'AVAILABLE',
      lockedBy: lockedSeatMap.get(seat.id)?.userId || null,
      lockExpiresAt: lockedSeatMap.get(seat.id)?.expiresAt || null,
    }));

    // Group by row
    const seatsByRow = seatsWithStatus.reduce(
      (acc, seat) => {
        if (!acc[seat.rowLetter]) {
          acc[seat.rowLetter] = [];
        }
        acc[seat.rowLetter].push(seat);
        return acc;
      },
      {} as Record<string, typeof seatsWithStatus>,
    );

    return {
      showtime,
      seatsByRow,
      pricing,
      summary: {
        total: seats.length,
        available: seatsWithStatus.filter((s) => s.status === 'AVAILABLE')
          .length,
        locked: seatsWithStatus.filter((s) => s.status === 'LOCKED').length,
        sold: seatsWithStatus.filter((s) => s.status === 'SOLD').length,
      },
    };
  }
}
