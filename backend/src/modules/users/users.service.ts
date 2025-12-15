import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaginationService } from '../../common/services/pagination.service';
import { UpdateUserDto, AssignUserRoleDto } from './dto/user.dto';
import { UserRole } from '../../common/constants/app.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    paginationParams: { page?: number; perPage?: number },
    role?: UserRole,
  ) {
    const { page, perPage } =
      this.paginationService.getPaginationParams(paginationParams);
    const skip = this.paginationService.getSkip(page, perPage);

    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: perPage,
        include: { cinema: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        cinema: true,
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            showtime: {
              include: {
                movie: true,
                cinema: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { cinema: true },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: { cinema: true },
    });
  }

  async assignRole(id: string, assignRoleDto: AssignUserRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role: assignRoleDto.role,
        cinemaId: assignRoleDto.cinemaId,
      },
      include: { cinema: true },
    });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  async findByCinema(cinemaId: string) {
    return this.prisma.user.findMany({
      where: {
        cinemaId,
        role: { in: ['MANAGER', 'STAFF'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
