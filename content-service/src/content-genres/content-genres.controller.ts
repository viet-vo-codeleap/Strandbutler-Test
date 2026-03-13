import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ContentGenresService } from './content-genres.service';
import { UpdateContentGenresDto } from './dto';
import { JwtAuthGuard, Roles, RolesGuard, UserRole as Role } from '@libs/common';

@Controller('content')
export class ContentGenresController {
  constructor(private readonly contentGenresService: ContentGenresService) {}

  /**
   * Update genres for content (Admin only)
   * PUT /api/content/:id/genres
   * Replaces all existing genres with new ones
   */
  @Put(':id/genres')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateGenres(
    @Param('id') contentId: string,
    @Body() updateDto: UpdateContentGenresDto,
  ) {
    const contentGenres = await this.contentGenresService.updateGenres(contentId, updateDto);
    return {
      content_id: contentId,
      genres: contentGenres.map(cg => cg.genre),
    };
  }

  /**
   * Get genres for content (Public)
   * GET /api/content/:id/genres
   */
  @Get(':id/genres')
  async getGenres(@Param('id') contentId: string) {
    const contentGenres = await this.contentGenresService.getGenresByContent(contentId);
    return {
      content_id: contentId,
      genres: contentGenres.map(cg => cg.genre),
    };
  }
}

@Controller('genres')
export class GenreContentController {
  constructor(private readonly contentGenresService: ContentGenresService) {}

  /**
   * Get content by genre (Public)
   * GET /api/genres/:id/content?page=1&limit=20
   */
  @Get(':id/content')
  async getContentByGenre(
    @Param('id', ParseIntPipe) genreId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const [contentGenres, total] = await this.contentGenresService.getContentByGenre(genreId, page, limit);

    return {
      data: contentGenres.map(cg => cg.content),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
