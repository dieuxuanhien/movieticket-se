import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SeatType } from '../../../common/constants/app.constants';

export class UpdateSeatDto {
  @ApiPropertyOptional({
    enum: SeatType,
    description: 'Seat type',
  })
  @IsOptional()
  @IsEnum(SeatType)
  type?: SeatType;
}
