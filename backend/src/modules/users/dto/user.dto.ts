import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/constants/app.constants';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: '+84901234567',
    description: 'Phone number of the user',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignUserRoleDto {
  @ApiProperty({
    enum: UserRole,
    description: 'Role to assign to the user',
    example: UserRole.MANAGER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Cinema ID to assign (required for MANAGER and STAFF roles)',
    example: 'uuid-of-cinema',
  })
  @IsOptional()
  @IsString()
  cinemaId?: string;
}
