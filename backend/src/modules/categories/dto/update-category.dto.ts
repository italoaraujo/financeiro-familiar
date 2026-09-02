import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Mercado e Feira', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Apple', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: '#059669', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;
}
