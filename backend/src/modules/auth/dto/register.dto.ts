import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva', maxLength: 100 })
  @IsString({ message: 'Nome deve ser um texto' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(100, { message: 'Nome não pode exceder 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'joao@email.com', maxLength: 150 })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @MaxLength(150, { message: 'E-mail não pode exceder 150 caracteres' })
  email: string;

  @ApiProperty({ example: 'SenhaForte123', minLength: 8, maxLength: 72 })
  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72, { message: 'A senha não pode exceder 72 caracteres' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: 'A senha deve conter ao menos uma letra e um número',
  })
  password: string;
}
