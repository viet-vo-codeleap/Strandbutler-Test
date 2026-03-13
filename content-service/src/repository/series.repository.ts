import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresRepository } from '@common/src/database/postgres/postgres.repository';
import { Series } from '../entities/series.entity';

/**
 * Repository for managing Series entities
 * Extends PostgresRepository to inherit common CRUD operations
 *
 * Design Pattern: Template Method Pattern
 * - Inherits base CRUD from PostgresRepository (create, update, delete, exists)
 * - Overrides findById() to customize relations loading
 * - Adds series-specific query methods
 *
 * series are containers for seasons, which contain episodes
 * - status: Ongoing/Ended/Cancelled
 * - seasons: One-to-many relationship with Season entity
 */
@Injectable()
export class SeriesRepository extends PostgresRepository<Series> {
  protected readonly logger = new Logger(SeriesRepository.name);

  /**
   * Override primary key field name since Series uses 'content_id' instead of 'id'
   * This allows base repository methods (update, delete, etc.) to work correctly
   */
  protected primaryKeyField = 'content_id';

  constructor(
    @InjectRepository(Series)
    seriesRepository: Repository<Series>,
  ) {
    super(seriesRepository);
  }

  /**
   * Find a series by its content ID
   * Overrides base implementation to eagerly load all related data including seasons
   * @param id - The UUID of the series (content_id)
   * @returns series with all relations or null if not found
   */
  override async findById(id: string): Promise<Series | null> {
    return await this.repository.findOne({
      where: { content_id: id },
      relations: [
        'genres', // Junction table entries linking series to genres
        'genres.genre', // Actual genre data (Drama, Comedy, Sci-Fi, etc.)
        'assets', // Media files (posters, trailers, backdrops, logos)
        'ratings', // User ratings (1-5 stars)
        'seasons', // All seasons for this series (for episode navigation)
        'seasons.credits', // Season credits (cast/crew per season)
        'seasons.credits.person', // Person details for season credits
      ],
    });
  }

  /**
   * Retrieve all series with pagination
   * Orders by creation date (newest first) for better user experience
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Tuple of [series array, total count for pagination UI]
   */
  async findAllSeries(page: number = 1, limit: number = 10): Promise<[Series[], number]> {
    return await this.findAndCount({
      relations: ['genres', 'genres.genre', 'assets'], // Load genres and assets for list view
      skip: (page - 1) * limit, // Calculate offset for pagination
      take: limit, // Limit results per page
      order: { created_at: 'DESC' }, // Show newest series first
    });
  }

  /**
   * Find series by status (Ongoing, Ended, Cancelled)
   * Useful for filtering content in UI
   * @param status - The status to filter by
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Tuple of [series array, total count]
   */
  async findByStatus(status: string, page: number = 1, limit: number = 10): Promise<[Series[], number]> {
    return await this.findAndCount({
      where: { status },
      relations: ['genres', 'genres.genre', 'assets'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find a series by its slug
   * Loads all related data just like findById for complete series details
   * @param slug - The URL-friendly slug of the series (e.g., 'breaking-bad-2008')
   * @returns Series with all relations or null if not found
   */
  async findBySlug(slug: string): Promise<Series | null> {
    return await this.repository.findOne({
      where: { slug },
      relations: [
        'genres', // Junction table entries linking series to genres
        'genres.genre', // Actual genre data (Drama, Comedy, Sci-Fi, etc.)
        'assets', // Media files (posters, trailers, backdrops, logos)
        'ratings', // User ratings (1-5 stars)
        'seasons', // All seasons for this series (for episode navigation)
        'seasons.credits', // Season credits (cast/crew per season)
        'seasons.credits.person', // Person details for season credits
      ],
    });
  }
}
