import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferDto } from './dto/transfer.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar receita, despesa ou compra parcelada' })
  @ApiResponse({ status: 201, description: 'Transação criada com sucesso' })
  async create(
    @GetUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Realizar transferência atômica entre contas' })
  @ApiResponse({ status: 201, description: 'Transferência efetuada com sucesso' })
  async transfer(
    @GetUser('id') userId: string,
    @Body() dto: TransferDto,
  ) {
    return this.transactionsService.transfer(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar extrato de transações com paginação e filtros' })
  async findAll(
    @GetUser('id') userId: string,
    @Query() filter: FilterTransactionDto,
  ) {
    return this.transactionsService.findAll(userId, filter);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir transação com estorno automático de saldo' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.remove(userId, id);
  }
}
