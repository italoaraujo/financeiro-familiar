import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar nova conta bancária ou carteira' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso' })
  async create(@GetUser('id') userId: string, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contas ativas' })
  @ApiQuery({ name: 'familyId', required: false, description: 'Filtrar por grupo familiar' })
  async findAll(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.accountsService.findAll(userId, familyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma conta' })
  async findById(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.findById(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar informações da conta' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(userId, id, dto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Arquivar uma conta' })
  async archive(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.archive(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir conta sem histórico de lançamentos' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.remove(userId, id);
  }
}
