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
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Goals')
@Controller('goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar nova meta financeira' })
  @ApiResponse({ status: 201, description: 'Meta cadastrada com sucesso' })
  async create(
    @GetUser('id') userId: string,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar metas e evolução de progresso' })
  @ApiQuery({ name: 'familyId', required: false })
  async findAll(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.goalsService.findAll(userId, familyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes da meta e histórico de aportes' })
  async findById(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.goalsService.findById(userId, id);
  }

  @Post(':id/deposits')
  @ApiOperation({ summary: 'Registrar aporte financeiro para a meta' })
  async addDeposit(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateDepositDto,
  ) {
    return this.goalsService.addDeposit(userId, id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar dados da meta' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir meta' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.goalsService.remove(userId, id);
  }
}
