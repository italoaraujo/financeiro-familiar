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
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Incluir cartões arquivados na listagem',
  })
  async findAll(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.creditCardsService.findAll(userId, familyId, includeArchived === 'true');
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

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Arquivar um cartão de crédito' })
  @ApiResponse({ status: 200, description: 'Cartão de crédito arquivado com sucesso' })
  async archive(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.creditCardsService.archive(userId, id);
  }

  @Patch(':id/unarchive')
  @ApiOperation({ summary: 'Desarquivar um cartão de crédito' })
  @ApiResponse({ status: 200, description: 'Cartão de crédito desarquivado com sucesso' })
  async unarchive(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.creditCardsService.unarchive(userId, id);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Favoritar um cartão de crédito para o usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Cartão de crédito favoritado com sucesso' })
  @ApiResponse({ status: 400, description: 'Não é possível favoritar um cartão arquivado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao cartão ou permissão insuficiente' })
  @ApiResponse({ status: 404, description: 'Cartão de crédito não encontrado' })
  async favorite(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.creditCardsService.favorite(userId, id);
  }

  @Patch(':id/unfavorite')
  @ApiOperation({ summary: 'Desfavoritar um cartão de crédito para o usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Cartão de crédito desfavoritado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao cartão ou permissão insuficiente' })
  @ApiResponse({ status: 404, description: 'Cartão de crédito não encontrado' })
  async unfavorite(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.creditCardsService.unfavorite(userId, id);
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
