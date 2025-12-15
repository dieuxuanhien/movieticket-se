import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { HallsService } from './halls.service';
import { CreateHallDto, UpdateHallDto, CreateSeatsDto } from './dto/hall.dto';
import { SupabaseGuard } from '../../common/guards/supabase.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { CinemaAccessGuard } from '../../common/guards/cinema-access.guard';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get hall by ID' })
  @ApiResponse({ status: 200, description: 'Hall details' })
  async findOne(@Param('id') id: string) {
    return this.hallsService.findById(id);
  }

  @Post()
  @UseGuards(SupabaseGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new hall (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Hall created' })
  async create(@Body() createHallDto: CreateHallDto) {
    return this.hallsService.create(createHallDto);
  }

  @Put(':id')
  @UseGuards(SupabaseGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a hall (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Hall updated' })
  async update(@Param('id') id: string, @Body() updateHallDto: UpdateHallDto) {
    return this.hallsService.update(id, updateHallDto);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a hall (Admin only)' })
  @ApiResponse({ status: 200, description: 'Hall deleted' })
  async delete(@Param('id') id: string) {
    return this.hallsService.delete(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get seats in a hall' })
  @ApiResponse({ status: 200, description: 'List of seats grouped by row' })
  async getSeats(@Param('id') id: string) {
    return this.hallsService.getSeats(id);
  }

  @Post(':id/seats')
  @UseGuards(SupabaseGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create seats for a hall (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Seats created' })
  async createSeats(
    @Param('id') id: string,
    @Body() createSeatsDto: CreateSeatsDto,
  ) {
    return this.hallsService.createSeats(id, createSeatsDto);
  }

  @Delete(':id/seats')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete all seats in a hall (Admin only)' })
  @ApiResponse({ status: 200, description: 'Seats deleted' })
  async deleteSeats(@Param('id') id: string) {
    return this.hallsService.deleteSeats(id);
  }
}
