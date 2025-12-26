import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto, UpdateShowtimeDto } from './dto/showtime.dto';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { CinemaAccessGuard } from '../../common/guards/cinema-access.guard';
import { UserRole } from '../../common/constants/app.constants';
import { SeatsService } from '../seats/seats.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('showtimes')
@Controller('showtimes')
export class ShowtimesController {
  constructor(
    private readonly showtimesService: ShowtimesService,
    private readonly seatsService: SeatsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all showtimes' })
  @ApiQuery({ name: 'movieId', required: false, type: String })
  @ApiQuery({ name: 'cinemaId', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of showtimes' })
  async findAll(
    @Query('movieId') movieId?: string,
    @Query('cinemaId') cinemaId?: string,
    @Query('date') date?: string,
  ) {
    return this.showtimesService.findAll(movieId, cinemaId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get showtime by ID' })
  @ApiResponse({ status: 200, description: 'Showtime details' })
  async findOne(@Param('id') id: string) {
    return this.showtimesService.findById(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get seat map for a showtime with availability' })
  @ApiResponse({ status: 200, description: 'Seat map with status' })
  async getSeats(@Param('id') id: string) {
    return this.seatsService.getSeatsByShowtime(id);
  }

  @Post()
  @UseGuards(ClerkGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new showtime (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Showtime created' })
  async create(@Body() createShowtimeDto: CreateShowtimeDto) {
    return this.showtimesService.create(createShowtimeDto);
  }

  @Put(':id')
  @UseGuards(ClerkGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a showtime (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Showtime updated' })
  async update(
    @Param('id') id: string,
    @Body() updateShowtimeDto: UpdateShowtimeDto,
  ) {
    return this.showtimesService.update(id, updateShowtimeDto);
  }

  @Delete(':id')
  @UseGuards(ClerkGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a showtime (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Showtime deleted' })
  async delete(@Param('id') id: string) {
    return this.showtimesService.delete(id);
  }
}
