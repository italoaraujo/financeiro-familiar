/**
 * Utilitário de validação de regras de senha para o Frontend.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const UPPERCASE_REGEX = /[A-Z]/;
export const LOWERCASE_REGEX = /[a-z]/;
export const NUMBER_REGEX = /[0-9]/;
export const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9\s]/;
export const NO_WHITESPACE_REGEX = /^\S+$/;

export const COMMON_PASSWORDS = new Set<string>([
  '1234567890',
  '12345678901',
  '123456789012',
  '0987654321',
  'password12',
  'password123',
  'password1234',
  'password123!',
  'password1234!',
  'passwords123',
  'p@ssword123',
  'p@ssword123!',
  'admin12345',
  'admin12345!',
  'admin123456',
  'administrator',
  'administrator1',
  'qwertyuiop',
  'qwertyuiop1',
  'qwerty1234',
  'qwerty12345',
  'qwerty1234!',
  'asdfghjkl1',
  'zxcvbnm123',
  '1q2w3e4r5t',
  'welcome123',
  'welcome123!',
  'welcome1234',
  'iloveyou123',
  'iloveyou123!',
  'monkey1234',
  'dragon1234',
  'football123',
  'baseball123',
  'master1234',
  'master1234!',
  'shadow1234',
  'superman123',
  'superman123!',
  'trustno1234',
  'princess123',
  'princess123!',
  'sunshine123',
  'freedom1234',
  'charlie1234',
  'michael1234',
  'jessica1234',
  'hunter12345',
  'starwars123',
  'abc1234567',
  'abc1234567!',
  'abc12345678',
  'default1234',
  'secret1234',
  'secret1234!',
  // Senhas frequentes em português
  'brasil1234',
  'brasil1234!',
  'brasil2024!',
  'brasil2025!',
  'brasil2026!',
  'trocar1234',
  'trocar1234!',
  'mudar12345',
  'mudar1234!',
  'mudar12345!',
  'senha12345',
  'senha12345!',
  'senha123456',
  'senhadificil',
  'senhadificil1',
  'senhaforte1',
  'senhaforte12',
  'senhaforte123',
  'senhaforte123!',
  'familia123',
  'familia123!',
  'familia1234',
  'familia1234!',
  'financeiro1',
  'financeiro12',
  'financeiro123',
  'financeiro123!',
  'sistema1234',
  'sistema1234!',
  'suporte1234',
  'suporte1234!',
  'portugal123',
  'flamengo123',
  'flamengo123!',
  'corinthians1',
  'palmeiras123',
  'saopaulo123',
  'vasco12345',
  'gremio12345',
  'cruzeiro123',
  'atletico123',
  'santos12345',
  'internacional',
  'temp123456!',
]);

export interface PasswordRuleItem {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordEvaluationResult {
  rules: PasswordRuleItem[];
  isValid: boolean;
  firstError?: string;
}

export function isCommonPassword(password: string): boolean {
  if (!password) return false;
  return COMMON_PASSWORDS.has(password.trim().toLowerCase());
}

export function isPasswordEqualToUserLogin(
  password: string,
  userIdentifiers?: { email?: string; name?: string },
): boolean {
  if (!password || !userIdentifiers) return false;

  const normalizedPassword = password.toLowerCase();

  if (userIdentifiers.email) {
    const normalizedEmail = userIdentifiers.email.trim().toLowerCase();
    if (normalizedPassword === normalizedEmail) {
      return true;
    }

    const emailUsername = normalizedEmail.split('@')[0];
    if (emailUsername && normalizedPassword === emailUsername) {
      return true;
    }
  }

  if (userIdentifiers.name) {
    const normalizedName = userIdentifiers.name.trim().toLowerCase();
    if (normalizedPassword === normalizedName) {
      return true;
    }
  }

  return false;
}

export function evaluatePasswordRules(
  password: string,
  userIdentifiers?: { email?: string; name?: string },
): PasswordEvaluationResult {
  const pwd = password || '';

  const hasValidLength = pwd.length >= PASSWORD_MIN_LENGTH && pwd.length <= PASSWORD_MAX_LENGTH;
  const hasUppercase = UPPERCASE_REGEX.test(pwd);
  const hasLowercase = LOWERCASE_REGEX.test(pwd);
  const hasNumber = NUMBER_REGEX.test(pwd);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(pwd);
  const hasNoWhitespace = pwd.length > 0 && !/\s/.test(pwd);
  const isNotUserLogin = pwd.length > 0 ? !isPasswordEqualToUserLogin(pwd, userIdentifiers) : true;
  const isNotCommon = pwd.length > 0 ? !isCommonPassword(pwd) : true;

  const rules: PasswordRuleItem[] = [
    {
      id: 'length',
      label: 'Pelo menos 8 caracteres',
      passed: hasValidLength,
    },
    {
      id: 'uppercase',
      label: 'Pelo menos 1 letra maiúscula',
      passed: hasUppercase,
    },
    {
      id: 'lowercase',
      label: 'Pelo menos 1 letra minúscula',
      passed: hasLowercase,
    },
    {
      id: 'number',
      label: 'Pelo menos 1 número',
      passed: hasNumber,
    },
    {
      id: 'special',
      label: 'Pelo menos 1 caractere especial',
      passed: hasSpecialChar,
    },
    {
      id: 'whitespace',
      label: 'Não pode conter espaços',
      passed: hasNoWhitespace,
    },
    {
      id: 'user_login',
      label: 'Não pode ser igual ao usuário/e-mail',
      passed: isNotUserLogin,
    },
    {
      id: 'not_common',
      label: 'Não pode estar na lista de senhas comuns',
      passed: isNotCommon,
    },
  ];

  const isValid = rules.every((r) => r.passed);

  let firstError: string | undefined;
  if (!hasValidLength) {
    firstError = `A senha deve possuir pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
  } else if (!hasUppercase) {
    firstError = 'A senha deve conter pelo menos 1 letra maiúscula';
  } else if (!hasLowercase) {
    firstError = 'A senha deve conter pelo menos 1 letra minúscula';
  } else if (!hasNumber) {
    firstError = 'A senha deve conter pelo menos 1 número';
  } else if (!hasSpecialChar) {
    firstError = 'A senha deve conter pelo menos 1 caractere especial';
  } else if (!hasNoWhitespace) {
    firstError = 'A senha não pode conter espaços';
  } else if (!isNotUserLogin) {
    firstError = 'A senha não pode ser igual ao usuário/e-mail';
  } else if (!isNotCommon) {
    firstError = 'A senha escolhida é muito comum e fácil de adivinhar';
  }

  return {
    rules,
    isValid,
    firstError,
  };
}
