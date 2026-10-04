import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  UPPERCASE_REGEX,
  LOWERCASE_REGEX,
  NUMBER_REGEX,
  SPECIAL_CHAR_REGEX,
  NO_WHITESPACE_REGEX,
  isCommonPassword,
  isPasswordEqualToUserLogin,
} from '../../../common/utils/password-rules.util';

@ValidatorConstraint({ name: 'IsNotEqualToUserLogin', async: false })
export class IsNotEqualToUserLoginConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    if (!password) return true;
    const obj = args.object as any;
    return !isPasswordEqualToUserLogin(password, {
      email: obj?.email,
      name: obj?.name,
    });
  }

  defaultMessage(args: ValidationArguments) {
    return 'A senha não pode ser igual ao usuário, e-mail ou nome';
  }
}

@ValidatorConstraint({ name: 'IsNotCommonPassword', async: false })
export class IsNotCommonPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string) {
    if (!password) return true;
    return !isCommonPassword(password);
  }

  defaultMessage() {
    return 'A senha não pode estar na lista de senhas comuns';
  }
}

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

  @ApiProperty({
    example: 'Senha@Forte123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description: 'Senha de 10 a 128 caracteres contendo maiúscula, minúscula, número e caractere especial sem espaços',
  })
  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'A senha deve ter no mínimo 10 caracteres' })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'A senha não pode exceder 128 caracteres' })
  @Matches(UPPERCASE_REGEX, { message: 'A senha deve conter ao menos uma letra maiúscula' })
  @Matches(LOWERCASE_REGEX, { message: 'A senha deve conter ao menos uma letra minúscula' })
  @Matches(NUMBER_REGEX, { message: 'A senha deve conter ao menos um número' })
  @Matches(SPECIAL_CHAR_REGEX, { message: 'A senha deve conter ao menos um caractere especial' })
  @Matches(NO_WHITESPACE_REGEX, { message: 'A senha não pode conter espaços' })
  @Validate(IsNotEqualToUserLoginConstraint)
  @Validate(IsNotCommonPasswordConstraint)
  password: string;
}
