import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blacklistService: TokenBlacklistService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Obter status público das funcionalidades de autenticação' })
  @ApiResponse({ status: 200, description: 'Status retornado com sucesso' })
  async getStatus() {
    return {
      registrationEnabled: this.authService.isRegistrationEnabled(),
    };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail já existente' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e obter token JWT' })
  @ApiResponse({ status: 200, description: 'Autenticação bem-sucedida' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  async getProfile(@GetUser() user: any) {
    return user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar sessão e revogar token atual' })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async logout(@Req() req: any) {
    const authHeader = req.headers?.authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
      await this.blacklistService.add(token);
    }
    return { message: 'Sessão encerrada com sucesso' };
  }
}
