import { IsEmail, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FamilyMemberRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({ example: 'esposa@email.com', maxLength: 150 })
  @IsEmail({}, { message: 'E-mail do membro é inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @MaxLength(150, { message: 'E-mail não pode exceder 150 caracteres' })
  email: string;

  @ApiProperty({ enum: FamilyMemberRole, default: FamilyMemberRole.MEMBER })
  @IsEnum(FamilyMemberRole, { message: 'Papel inválido (OWNER, ADMIN, MEMBER, VIEWER)' })
  @IsNotEmpty({ message: 'Papel é obrigatório' })
  role: FamilyMemberRole;
}
