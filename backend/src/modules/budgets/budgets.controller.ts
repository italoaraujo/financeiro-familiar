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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar teto de gastos para categoria e mês' })
  @ApiResponse({ status: 201, description: 'Orçamento criado com sucesso' })
  async create(
    @GetUser('id') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar orçamentos com progresso de consumo e alertas' })
  @ApiQuery({ name: 'periodMonth', required: false, example: '2026-09' })
  @ApiQuery({ name: 'familyId', required: false })
  async findAll(
    @GetUser('id') userId: string,
    @Query('periodMonth') periodMonth?: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.budgetsService.findAll(userId, periodMonth, familyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar valor do teto ou percentual de alerta' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir orçamento' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.remove(userId, id);
  }
}
