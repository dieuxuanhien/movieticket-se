import { Controller, Get, Post, Param, UseGuards, Body } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ScanTicketDto } from './dto/ticket.dto';
import { SupabaseGuard } from '../../common/guards/supabase.guard';
import { RoleGuard, Roles } from '../../common/guards/role.guard';
import { CinemaAccessGuard } from '../../common/guards/cinema-access.guard';
import { CurrentUserCinemaId } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/app.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }

  @Post('scan')
  @UseGuards(SupabaseGuard, RoleGuard, CinemaAccessGuard)
  @Roles(UserRole.STAFF, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Scan ticket at entry (Staff/Manager)' })
  @ApiResponse({
    status: 200,
    description: 'Ticket validated and marked as used',
  })
  async scanTicket(
    @Body() scanTicketDto: ScanTicketDto,
    @CurrentUserCinemaId() staffCinemaId: string,
  ) {
    return this.ticketsService.scanTicket(scanTicketDto, staffCinemaId);
  }

  @Get('booking/:bookingId')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get tickets for a booking' })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async getByBooking(@Param('bookingId') bookingId: string) {
    return this.ticketsService.getTicketsByBooking(bookingId);
  }

  @Get('showtime/:showtimeId')
  @UseGuards(SupabaseGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all tickets for a showtime (Admin/Manager/Staff)',
  })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async getByShowtime(@Param('showtimeId') showtimeId: string) {
    return this.ticketsService.getTicketsByShowtime(showtimeId);
  }
}
