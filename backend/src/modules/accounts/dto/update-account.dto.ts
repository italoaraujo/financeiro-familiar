import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class UpdateAccountDto {
  @ApiProperty({ example: 'Itaú Personalité', required: false, maxLength: 100 })
  @IsString()
  @MaxLength(100, { message: 'Nome da conta não pode exceder 100 caracteres' })
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: AccountType, required: false })
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @ApiProperty({ example: '#3b82f6', required: false, maxLength: 7 })
  @IsString()
  @MaxLength(7, { message: 'Cor não pode exceder 7 caracteres' })
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'Building2', required: false, maxLength: 50 })
  @IsString()
  @MaxLength(50, { message: 'Ícone não pode exceder 50 caracteres' })
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;
}
