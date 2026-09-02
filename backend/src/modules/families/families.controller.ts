import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Families')
@Controller('families')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo grupo familiar' })
  @ApiResponse({ status: 201, description: 'Família criada com sucesso' })
  async create(@GetUser('id') userId: string, @Body() dto: CreateFamilyDto) {
    return this.familiesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar famílias das quais o usuário é membro' })
  async getUserFamilies(@GetUser('id') userId: string) {
    return this.familiesService.getUserFamilies(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma família por ID' })
  async getFamily(
    @GetUser('id') userId: string,
    @Param('id') familyId: string,
  ) {
    return this.familiesService.getFamily(userId, familyId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Adicionar novo membro ao grupo familiar' })
  async addMember(
    @GetUser('id') userId: string,
    @Param('id') familyId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.familiesService.addMember(userId, familyId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remover membro do grupo familiar' })
  async removeMember(
    @GetUser('id') userId: string,
    @Param('id') familyId: string,
    @Param('memberId') targetUserId: string,
  ) {
    return this.familiesService.removeMember(userId, familyId, targetUserId);
  }
}
