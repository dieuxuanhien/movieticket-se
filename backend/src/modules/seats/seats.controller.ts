import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { UpdateSeatDto } from './dto/seat.dto';
import { SupabaseGuard } from '../../common/guards/supabase.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('seats')
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get seat by ID' })
  @ApiResponse({ status: 200, description: 'Seat details' })
  async findOne(@Param('id') id: string) {
    return this.seatsService.findById(id);
  }

  @Put(':id')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a seat (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Seat updated' })
  async update(@Param('id') id: string, @Body() updateSeatDto: UpdateSeatDto) {
    return this.seatsService.update(id, updateSeatDto);
  }
}
