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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { TransactionType } from '@prisma/client';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar categoria ou subcategoria personalizada' })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso' })
  async create(@GetUser('id') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de categorias e subcategorias' })
  @ApiQuery({ name: 'familyId', required: false })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  async findAll(
    @GetUser('id') userId: string,
    @Query('familyId') familyId?: string,
    @Query('type') type?: TransactionType,
  ) {
    return this.categoriesService.findAll(userId, familyId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter categoria por ID' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar categoria personalizada' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir categoria não utilizada' })
  async remove(
    @GetUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(userId, id);
  }
}
