import { Injectable, Logger } from '@nestjs/common';
import { ContentGenreRepository } from './content-genres.repository';
import { UpdateContentGenresDto } from './dto';
import { ContentGenre } from '../entities/content-genre.entity';

/**
 * Service layer for Content-Genre relationship
 * Manages many-to-many relationship between content and genres
 */
@Injectable()
export class ContentGenresService {
  private readonly logger = new Logger(ContentGenresService.name);

  constructor(
    private readonly contentGenreRepository: ContentGenreRepository,
  ) {}

  /**
   * Update genres for content (replace all genres)
   * Frontend already verified content and genres exist
   * @param contentId - Content UUID
   * @param updateDto - Array of genre IDs
   * @returns Updated list of content genres
   */
  async updateGenres(contentId: string, updateDto: UpdateContentGenresDto): Promise<ContentGenre[]> {
    this.logger.log(`Updating genres for content ${contentId}`);

    try {
      // Step 1: Remove all existing genres for this content
      await this.contentGenreRepository.deleteByContentId(contentId);
      this.logger.log(`Removed existing genres for content ${contentId}`);

      // Step 2: Add new genre associations
      const contentGenres: ContentGenre[] = [];
      for (const genreId of updateDto.genre_ids) {
        const contentGenre = await this.contentGenreRepository.create(contentId, genreId);
        contentGenres.push(contentGenre);
      }

      this.logger.log(`Added ${contentGenres.length} genres to content ${contentId}`);
      return contentGenres;
    } catch (error) {
      this.logger.error(`Failed to update genres for content ${contentId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get genres for content
   * @param contentId - Content UUID
   * @returns List of genres assigned to this content
   */
  async getGenresByContent(contentId: string): Promise<ContentGenre[]> {
    this.logger.log(`Fetching genres for content ${contentId}`);
    return await this.contentGenreRepository.findByContentId(contentId);
  }

  /**
   * Get content by genre
   * @param genreId - Genre ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Tuple of [content array, total count]
   */
  async getContentByGenre(genreId: number, page: number = 1, limit: number = 20): Promise<[ContentGenre[], number]> {
    this.logger.log(`Fetching content for genre ${genreId} - page: ${page}, limit: ${limit}`);
    return await this.contentGenreRepository.findByGenreId(genreId, page, limit);
  }
}
