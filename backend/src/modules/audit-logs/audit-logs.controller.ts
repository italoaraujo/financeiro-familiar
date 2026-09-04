import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { FamilyMemberRole } from '@prisma/client';

@ApiTags('AuditLogs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de auditoria com paginação e filtros' })
  @ApiResponse({ status: 200, description: 'Lista de logs retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente para visualizar logs desta família' })
  async findAll(
    @GetUser('id') userId: string,
    @Query() query: FindAuditLogsDto,
  ) {
    if (query.familyId) {
      await this.ensureFamilyAdminAccess(userId, query.familyId);
    } else {
      // Sem especificar família, filtra estritamente os logs das ações do próprio usuário logado
      query.userId = userId;
    }

    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um log de auditoria específico' })
  @ApiResponse({ status: 200, description: 'Detalhes do log' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao log' })
  @ApiResponse({ status: 404, description: 'Log não encontrado' })
  async findById(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const log = await this.auditLogsService.findById(id);

    if (log.familyId) {
      await this.ensureFamilyAdminAccess(userId, log.familyId);
    } else if (log.userId && log.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para visualizar este log de auditoria');
    }

    return log;
  }

  private async ensureFamilyAdminAccess(userId: string, familyId: string): Promise<void> {
    const membership = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
    });

    if (
      !membership ||
      (membership.role !== FamilyMemberRole.OWNER &&
        membership.role !== FamilyMemberRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar logs desta família. Exclusivo para Administrador ou Proprietário.',
      );
    }
  }
}
