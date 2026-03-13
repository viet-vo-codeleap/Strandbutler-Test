import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { MovieRepository } from '../repository/movie.repository';
import { CreateMovieDto, UpdateMovieDto } from '../dto';
import { Movie } from '../entities/movie.entity';
import { ContentGenresService } from '../content-genres/content-genres.service';
import { ElasticsearchContentService } from '../elasticsearch/elasticsearch-content.service';
import { generateSlug } from '../utils/slug.util';

/**
 * Service layer for Movie business logic
 * Handles data transformation and business rules between controllers and repositories
 *
 * Responsibilities:
 * - Validate business rules before database operations
 * - Transform DTOs to entities and vice versa
 * - Handle cross-cutting concerns (logging, error handling)
 * - Coordinate multiple repository operations if needed
 * - Auto-index content to Elasticsearch
 *
 * Pattern: Service Layer Pattern
 * - Controllers handle HTTP concerns (requests, responses, status codes)
 * - Services handle business logic
 * - Repositories handle data access
 */
@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    private readonly movieRepository: MovieRepository,
    private readonly contentGenresService: ContentGenresService,
    private readonly elasticsearchService: ElasticsearchContentService,
  ) {}

  /**
   * Create a new movie
   * @param createMovieDto - Movie data from request
   * @returns The created movie with generated ID
   */
  async create(createMovieDto: CreateMovieDto): Promise<Movie> {
    this.logger.log(`Creating new movie: ${createMovieDto.title}`);

    try {
      // Extract genre_ids from DTO (not a Movie entity property)
      const { genre_ids, ...movieFields } = createMovieDto;

      // Auto-generate slug if not provided
      const slug = movieFields.slug || generateSlug(createMovieDto.title);
      this.logger.log(`Using slug: ${slug}`);

      // Transform DTO to entity format (convert date strings to Date objects)
      const movieData: Partial<Movie> = {
        ...movieFields,
        slug,
        release_date: createMovieDto.release_date ? new Date(createMovieDto.release_date) : undefined,
      };

      const movie = await this.movieRepository.create(movieData);
      this.logger.log(`Movie created successfully with ID: ${movie.content_id}`);

      // If genre_ids provided, assign genres to the movie
      if (genre_ids && genre_ids.length > 0) {
        this.logger.log(`Assigning ${genre_ids.length} genres to movie ${movie.content_id}`);
        await this.contentGenresService.updateGenres(movie.content_id, { genre_ids });
      }

      // Fetch and return the complete movie with genres
      const createdMovie = await this.findOne(movie.content_id);

      // Index to Elasticsearch asynchronously (don't wait for it)
      this.elasticsearchService.indexContent(createdMovie).catch((error) => {
        this.logger.error(`Failed to index movie to Elasticsearch: ${error.message}`);
      });

      return createdMovie;
    } catch (error) {
      this.logger.error(`Failed to create movie: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all movies with pagination
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Tuple of [movies array, total count]
   */
  async findAll(page: number = 1, limit: number = 10): Promise<[Movie[], number]> {
    // Enforce maximum limit to prevent performance issues
    const safeLimit = Math.min(limit, 100);
    this.logger.log(`Fetching movies - page: ${page}, limit: ${safeLimit}`);

    const [movies, total] = await this.movieRepository.findAllMovies(page, safeLimit);
    this.logger.log(`Found ${total} movies, returning page ${page}`);

    return [movies, total];
  }

  /**
   * Find a single movie by ID
   * @param id - Movie content_id
   * @returns Movie with all relations
   * @throws NotFoundException if movie doesn't exist
   */
  async findOne(id: string): Promise<Movie> {
    this.logger.log(`Fetching movie with ID: ${id}`);

    const movie = await this.movieRepository.findById(id);

    if (!movie) {
      this.logger.warn(`Movie not found with ID: ${id}`);
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    return movie;
  }

  /**
   * Update a movie
   * @param id - Movie content_id
   * @param updateMovieDto - Partial movie data to update
   * @returns The updated movie
   * @throws NotFoundException if movie doesn't exist
   */
  async update(id: string, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    this.logger.log(`Updating movie with ID: ${id}`);

    // Verify movie exists before updating
    await this.findOne(id);

    try {
      // Extract genre_ids from DTO (not a Movie entity property)
      const { genre_ids, ...movieFields } = updateMovieDto;

      // Only update movie fields if there are any
      if (Object.keys(movieFields).length > 0) {
        // Transform DTO to entity format (convert date strings to Date objects)
        const updateData: Partial<Movie> = {
          ...movieFields,
          release_date: updateMovieDto.release_date ? new Date(updateMovieDto.release_date) : undefined,
        };

        await this.movieRepository.update(id, updateData);
        this.logger.log(`Movie fields updated successfully: ${id}`);
      }

      // If genre_ids provided, update genres
      if (genre_ids !== undefined) {
        this.logger.log(`Updating genres for movie ${id}`);
        await this.contentGenresService.updateGenres(id, { genre_ids });
      }

      // Fetch and return the complete updated movie with all relations
      const updatedMovie = await this.findOne(id);

      // Update in Elasticsearch asynchronously
      this.elasticsearchService.updateContent(updatedMovie).catch((error) => {
        this.logger.error(`Failed to update movie in Elasticsearch: ${error.message}`);
      });

      return updatedMovie;
    } catch (error) {
      this.logger.error(`Failed to update movie ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a movie
   * Cascade deletes will remove related ratings, assets, etc.
   * @param id - Movie content_id
   * @returns true if deleted successfully
   * @throws NotFoundException if movie doesn't exist
   */
  async remove(id: string): Promise<boolean> {
    this.logger.log(`Deleting movie with ID: ${id}`);

    // Verify movie exists before deleting
    await this.findOne(id);

    try {
      const deleted = await this.movieRepository.delete(id);

      // Remove from Elasticsearch asynchronously
      this.elasticsearchService.removeContent(id).catch((error) => {
        this.logger.error(`Failed to remove movie from Elasticsearch: ${error.message}`);
      });

      this.logger.log(`Movie deleted successfully: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete movie ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a movie exists
   * Useful for validation in other services
   * @param id - Movie content_id
   * @returns true if exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    return await this.movieRepository.exists(id);
  }

  /**
   * Find a single movie by slug
   * @param slug - Movie slug (e.g., 'inception-2010')
   * @returns Movie with all relations
   * @throws NotFoundException if movie doesn't exist
   */
  async findBySlug(slug: string): Promise<Movie> {
    this.logger.log(`Fetching movie with slug: ${slug}`);

    const movie = await this.movieRepository.findBySlug(slug);

    if (!movie) {
      this.logger.warn(`Movie not found with slug: ${slug}`);
      throw new NotFoundException(`Movie with slug '${slug}' not found`);
    }

    return movie;
  }
}
