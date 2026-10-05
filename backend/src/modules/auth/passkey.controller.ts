import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PasskeyService } from './passkey.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Passkeys')
@Controller('auth/passkey')
export class PasskeyController {
  constructor(private readonly passkeyService: PasskeyService) {}

  @Post('register-options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gerar opções FIDO2 para cadastro de biometria' })
  @ApiResponse({ status: 200, description: 'Opções geradas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getRegisterOptions(@GetUser() user: any) {
    return this.passkeyService.generateRegistrationOptions(user.id, user.email);
  }

  @Post('register-verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar e salvar credencial biométrica cadastrada' })
  @ApiResponse({ status: 201, description: 'Credencial registrada com sucesso' })
  @ApiResponse({ status: 401, description: 'Desafio expirado ou assinatura inválida' })
  async verifyRegistration(@GetUser() user: any, @Body() body: any) {
    return this.passkeyService.verifyRegistration(user.id, body);
  }

  @Post('login-options')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar opções públicas de autenticação biométrica' })
  @ApiResponse({ status: 200, description: 'Opções de login retornadas com sucesso' })
  @ApiResponse({ status: 429, description: 'Muitas requisições' })
  async getLoginOptions() {
    return this.passkeyService.generateAuthenticationOptions();
  }

  @Post('login-verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar assinatura biométrica e realizar login' })
  @ApiResponse({ status: 200, description: 'Autenticação bem-sucedida e emissão de JWT' })
  @ApiResponse({ status: 401, description: 'Assinatura biométrica inválida ou replay attack' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async verifyLogin(@Body() body: any) {
    return this.passkeyService.verifyAuthentication(body);
  }

  @Get('credentials')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar dispositivos e biometrias cadastrados do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de credenciais retornada com sucesso' })
  async listCredentials(@GetUser() user: any) {
    return this.passkeyService.listUserCredentials(user.id);
  }

  @Delete('credentials/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover credencial biométrica cadastrada' })
  @ApiResponse({ status: 200, description: 'Credencial removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Credencial não encontrada' })
  async deleteCredential(@GetUser() user: any, @Param('id') id: string) {
    return this.passkeyService.deleteCredential(user.id, id);
  }
}
