import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresRepository } from '@common/src/database/postgres/postgres.repository';
import { Movie } from '../entities/movie.entity';

/**
 * Repository for managing Movie entities
 * Extends PostgresRepository to inherit common CRUD operations
 *
 * Design Pattern: Template Method Pattern
 * - Inherits base CRUD from PostgresRepository (create, update, delete, exists)
 * - Overrides findById() to customize relations loading
 * - Adds movie-specific query methods
 *
 * Movies are a child entity of ContentItem with additional fields:
 * - duration_minutes: Movie runtime in minutes
 * - stream_asset_id: Identifier for streaming service to locate video file
 */
@Injectable()
export class MovieRepository extends PostgresRepository<Movie> {
  protected readonly logger = new Logger(MovieRepository.name);

  /**
   * Override primary key field name since Movie uses 'content_id' instead of 'id'
   * This allows base repository methods (update, delete, etc.) to work correctly
   */
  protected primaryKeyField = 'content_id';

  constructor(
    @InjectRepository(Movie)
    movieRepository: Repository<Movie>,
  ) {
    super(movieRepository);
  }

  /**
   * Find a movie by its content ID
   * Overrides base implementation to eagerly load all related data for complete movie details
   * @param id - The UUID of the movie (content_id)
   * @returns Movie with all relations or null if not found
   */
  override async findById(id: string): Promise<Movie | null> {
    return await this.repository.findOne({
      where: { content_id: id },
      relations: [
        'genres', // Junction table entries linking movie to genres
        'genres.genre', // Actual genre data (Action, Drama, etc.)
        'credits', // Movie credits (cast/crew)
        'credits.person', // Person details (actors, directors, writers)
        'assets', // Media files (posters, trailers, backdrops)
        'ratings', // User ratings (1-5 stars)
      ],
      order: {
        credits: {
          order: 'ASC', // Order credits by display order
        },
      },
    });
  }

  /**
   * Retrieve all movies with pagination
   * Orders by creation date (newest first) for better user experience
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Tuple of [movies array, total count for pagination UI]
   */
  async findAllMovies(page: number = 1, limit: number = 10): Promise<[Movie[], number]> {
    return await this.findAndCount({
      relations: ['genres', 'genres.genre', 'assets'], // Load genres and assets for list view
      skip: (page - 1) * limit, // Calculate offset for pagination
      take: limit, // Limit results per page
      order: { created_at: 'DESC' }, // Show newest movies first
    });
  }

  /**
   * Find a movie by its slug
   * Loads all related data just like findById for complete movie details
   * @param slug - The URL-friendly slug of the movie (e.g., 'inception-2010')
   * @returns Movie with all relations or null if not found
   */
  async findBySlug(slug: string): Promise<Movie | null> {
    return await this.repository.findOne({
      where: { slug },
      relations: [
        'genres', // Junction table entries linking movie to genres
        'genres.genre', // Actual genre data (Action, Drama, etc.)
        'credits', // Movie credits (cast/crew)
        'credits.person', // Person details (actors, directors, writers)
        'assets', // Media files (posters, trailers, backdrops)
        'ratings', // User ratings (1-5 stars)
      ],
      order: {
        credits: {
          order: 'ASC', // Order credits by display order
        },
      },
    });
  }
}
