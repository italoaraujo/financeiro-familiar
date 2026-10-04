import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Tags')
@Controller('tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tags disponíveis para autocomplete no escopo pessoal ou familiar' })
  @ApiQuery({ name: 'familyId', required: false, description: 'ID do grupo familiar (opcional)' })
  async findAll(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.tagsService.findAll(userId, familyId);
  }
}
