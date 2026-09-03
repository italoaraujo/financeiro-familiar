import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('CreditCards')
@Controller('credit-cards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo cartão de crédito' })
  @ApiResponse({ status: 201, description: 'Cartão de crédito criado com sucesso' })
  async create(@GetUser('id') userId: string, @Body() dto: CreateCreditCardDto) {
    return this.creditCardsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cartões com limite disponível e faturas' })
  @ApiQuery({ name: 'familyId', required: false })
  async findAll(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.creditCardsService.findAll(userId, familyId);
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Obter detalhes da fatura com divisão por pessoa' })
  async getInvoiceDetails(
    @GetUser('id') userId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.creditCardsService.getInvoiceDetails(userId, invoiceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do cartão e faturas' })
  async findById(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.creditCardsService.findById(userId, id);
  }

  @Post('invoices/:invoiceId/pay')
  @ApiOperation({ summary: 'Registrar pagamento de fatura debitando em conta' })
  async payInvoice(
    @GetUser('id') userId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.creditCardsService.payInvoice(userId, invoiceId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar dados cadastrais do cartão de crédito' })
  @ApiResponse({ status: 200, description: 'Cartão de crédito atualizado com sucesso' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditCardDto,
  ) {
    return this.creditCardsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir cartão de crédito sem histórico de lançamentos' })
  @ApiResponse({ status: 200, description: 'Cartão de crédito removido com sucesso' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.creditCardsService.remove(userId, id);
  }
}
