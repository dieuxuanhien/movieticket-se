import { IsString, MinLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateGenreDto {
  @ApiProperty({
    example: 'Action',
    description: 'Genre name',
  })
  @IsString()
  @MinLength(2)
  name: string;
}

export class UpdateGenreDto extends PartialType(CreateGenreDto) {}
