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
import { CinemasService } from './cinemas.service';
import { CreateCinemaDto, UpdateCinemaDto } from './dto/cinema.dto';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('cinemas')
@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cinemas' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of cinemas' })
  async findAll(
    @Query('city') city?: string,
    @Query('status') status?: string,
  ) {
    return this.cinemasService.findAll(city, status);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get list of cities with cinemas' })
  @ApiResponse({ status: 200, description: 'List of cities' })
  async getCities() {
    return this.cinemasService.getCities();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cinema by ID' })
  @ApiResponse({ status: 200, description: 'Cinema details' })
  async findOne(@Param('id') id: string) {
    return this.cinemasService.findById(id);
  }

  @Post()
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new cinema (Admin only)' })
  @ApiResponse({ status: 201, description: 'Cinema created' })
  async create(@Body() createCinemaDto: CreateCinemaDto) {
    return this.cinemasService.create(createCinemaDto);
  }

  @Put(':id')
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a cinema (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cinema updated' })
  async update(
    @Param('id') id: string,
    @Body() updateCinemaDto: UpdateCinemaDto,
  ) {
    return this.cinemasService.update(id, updateCinemaDto);
  }

  @Delete(':id')
  @UseGuards(ClerkGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a cinema (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cinema deleted' })
  async delete(@Param('id') id: string) {
    return this.cinemasService.delete(id);
  }

  @Get(':id/halls')
  @ApiOperation({ summary: 'Get halls in a cinema' })
  @ApiResponse({ status: 200, description: 'List of halls' })
  async getHalls(@Param('id') id: string) {
    return this.cinemasService.getHalls(id);
  }

  @Get(':id/showtimes')
  @ApiOperation({ summary: 'Get showtimes at a cinema' })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'movieId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of showtimes' })
  async getShowtimes(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('movieId') movieId?: string,
  ) {
    return this.cinemasService.getShowtimes(id, date, movieId);
  }
}
