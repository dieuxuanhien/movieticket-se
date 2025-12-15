import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateGenreDto, UpdateGenreDto } from './dto/genre.dto';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movies: true },
        },
      },
    });
  }

  async findById(id: string) {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
      include: {
        movies: {
          take: 10,
          orderBy: { releaseDate: 'desc' },
        },
      },
    });

    if (!genre) {
      throw new NotFoundException('Genre not found');
    }

    return genre;
  }

  async create(createGenreDto: CreateGenreDto) {
    // Check if genre with same name already exists
    const existingGenre = await this.prisma.genre.findUnique({
      where: { name: createGenreDto.name },
    });

    if (existingGenre) {
      throw new ConflictException('Genre with this name already exists');
    }

    return this.prisma.genre.create({
      data: createGenreDto,
    });
  }

  async update(id: string, updateGenreDto: UpdateGenreDto) {
    const genre = await this.prisma.genre.findUnique({ where: { id } });

    if (!genre) {
      throw new NotFoundException('Genre not found');
    }

    // Check if another genre with same name exists
    if (updateGenreDto.name) {
      const existingGenre = await this.prisma.genre.findFirst({
        where: {
          name: updateGenreDto.name,
          NOT: { id },
        },
      });

      if (existingGenre) {
        throw new ConflictException('Genre with this name already exists');
      }
    }

    return this.prisma.genre.update({
      where: { id },
      data: updateGenreDto,
    });
  }

  async delete(id: string) {
    const genre = await this.prisma.genre.findUnique({ where: { id } });

    if (!genre) {
      throw new NotFoundException('Genre not found');
    }

    await this.prisma.genre.delete({ where: { id } });

    return { message: 'Genre deleted successfully' };
  }
}
