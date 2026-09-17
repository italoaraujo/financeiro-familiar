import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Response } from 'express';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obter resumo consolidado para o dashboard' })
  @ApiQuery({ name: 'periodMonth', required: false, example: '2026-09' })
  @ApiQuery({ name: 'familyId', required: false })
  @ApiQuery({ name: 'tagId', required: false })
  async getDashboard(
    @GetUser('id') userId: string,
    @Query('periodMonth') periodMonth?: string,
    @Query('familyId') familyId?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.reportsService.getDashboardSummary(userId, familyId, periodMonth, tagId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obter distribuição de despesas por categoria' })
  @ApiQuery({ name: 'periodMonth', required: false, example: '2026-09' })
  @ApiQuery({ name: 'familyId', required: false })
  @ApiQuery({ name: 'tagId', required: false })
  async getExpensesByCategory(
    @GetUser('id') userId: string,
    @Query('periodMonth') periodMonth?: string,
    @Query('familyId') familyId?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.reportsService.getExpensesByCategory(userId, familyId, periodMonth, tagId);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Obter distribuição de despesas por tag' })
  @ApiQuery({ name: 'periodMonth', required: false, example: '2026-09' })
  @ApiQuery({ name: 'familyId', required: false })
  async getExpensesByTag(
    @GetUser('id') userId: string,
    @Query('periodMonth') periodMonth?: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.reportsService.getExpensesByTag(userId, familyId, periodMonth);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Obter evolução mensal do fluxo de caixa (receitas vs despesas)' })
  @ApiQuery({ name: 'familyId', required: false })
  @ApiQuery({ name: 'months', required: false, example: 6 })
  @ApiQuery({ name: 'tagId', required: false })
  async getCashFlow(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
    @Query('months') months?: number,
    @Query('tagId') tagId?: string,
  ) {
    return this.reportsService.getCashFlow(userId, familyId, months ? Number(months) : 6, tagId);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Exportar extrato filtrado em formato CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="extrato-financeiro.csv"')
  async exportCsv(
    @GetUser('id') userId: string,
    @Res() res: Response,
    @Query('familyId') familyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tagId') tagId?: string,
  ) {
    const csvData = await this.reportsService.exportCsv(userId, familyId, startDate, endDate, tagId);
    res.send(csvData);
  }
}
