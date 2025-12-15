import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ScanTicketDto {
  @ApiPropertyOptional({
    description: 'Ticket ID (from QR code)',
    example: 'uuid-of-ticket',
  })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional({
    description: 'Booking code (alternative to ticketId)',
    example: 'BKABCD123456',
  })
  @IsOptional()
  @IsString()
  bookingCode?: string;
}
