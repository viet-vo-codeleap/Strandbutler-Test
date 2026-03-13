import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { CreateGenreDto, UpdateGenreDto } from './dto';
import { JwtAuthGuard, Roles, RolesGuard, UserRole as Role, Public } from '@libs/common';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  /**
   * Create a new genre (Admin only)
   * POST /api/genres/create
   */
  @Post("/create")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createGenreDto: CreateGenreDto) {
    return await this.genresService.create(createGenreDto);
  }

  /**
   * Get all genres with content counts (Public)
   * GET /api/genres
   */
  @Get("/all")
  @Public()
  async findAll() {
    return await this.genresService.findAll();
  }

  /**
   * Get single genre by ID (Public)
   * GET /api/genres/:id
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.genresService.findOne(id);
  }

  /**
   * Update a genre (Admin only)
   * PATCH /api/genres/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return await this.genresService.update(id, updateGenreDto);
  }

  /**
   * Delete a genre (Admin only)
   * DELETE /api/genres/:id
   * Note: Will fail if genre has content assigned
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.genresService.remove(id);
  }
}
