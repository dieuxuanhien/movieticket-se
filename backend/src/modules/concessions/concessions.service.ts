import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateConcessionDto, UpdateConcessionDto } from './dto/concession.dto';

@Injectable()
export class ConcessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(cinemaId?: string) {
    const where: any = {};

    if (cinemaId) {
      where.OR = [{ cinemaId }, { cinemaId: null }]; // Include global and cinema-specific
    }

    return this.prisma.concession.findMany({
      where,
      include: {
        cinema: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const concession = await this.prisma.concession.findUnique({
      where: { id },
      include: {
        cinema: {
          select: { id: true, name: true },
        },
      },
    });

    if (!concession) {
      throw new NotFoundException('Concession not found');
    }

    return concession;
  }

  async create(createConcessionDto: CreateConcessionDto) {
    // Validate cinema if provided
    if (createConcessionDto.cinemaId) {
      const cinema = await this.prisma.cinema.findUnique({
        where: { id: createConcessionDto.cinemaId },
      });

      if (!cinema) {
        throw new NotFoundException('Cinema not found');
      }
    }

    return this.prisma.concession.create({
      data: createConcessionDto,
      include: {
        cinema: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(id: string, updateConcessionDto: UpdateConcessionDto) {
    const concession = await this.prisma.concession.findUnique({
      where: { id },
    });

    if (!concession) {
      throw new NotFoundException('Concession not found');
    }

    return this.prisma.concession.update({
      where: { id },
      data: updateConcessionDto,
      include: {
        cinema: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string) {
    const concession = await this.prisma.concession.findUnique({
      where: { id },
    });

    if (!concession) {
      throw new NotFoundException('Concession not found');
    }

    await this.prisma.concession.delete({ where: { id } });

    return { message: 'Concession deleted successfully' };
  }
}
