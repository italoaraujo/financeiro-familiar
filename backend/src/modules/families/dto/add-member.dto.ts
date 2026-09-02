import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FamilyMemberRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({ example: 'esposa@email.com' })
  @IsEmail({}, { message: 'E-mail do membro é inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({ enum: FamilyMemberRole, default: FamilyMemberRole.MEMBER })
  @IsEnum(FamilyMemberRole, { message: 'Papel inválido (OWNER, ADMIN, MEMBER, VIEWER)' })
  @IsNotEmpty({ message: 'Papel é obrigatório' })
  role: FamilyMemberRole;
}
