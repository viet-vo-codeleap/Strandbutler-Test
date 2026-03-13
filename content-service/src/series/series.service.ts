import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SeriesRepository } from '../repository/series.repository';
import { CreateSeriesDto, UpdateSeriesDto } from '../dto';
import { Series } from '../entities/series.entity';
import { ContentGenresService } from '../content-genres/content-genres.service';
import { ElasticsearchContentService } from '../elasticsearch/elasticsearch-content.service';
import { generateSlug } from '../utils/slug.util';

/**
 * Service layer for TV Show business logic
 * Handles data transformation and business rules between controllers and repositories
 *
 * Responsibilities:
 * - Validate business rules before database operations
 * - Transform DTOs to entities and vice versa
 * - Handle cross-cutting concerns (logging, error handling)
 * - Coordinate repository operations
 * - Auto-index content to Elasticsearch
 *
 * Pattern: Service Layer Pattern
 * - Separates business logic from HTTP concerns
 * - Provides reusable methods for TV show operations
 */
@Injectable()
export class SeriesService {
  private readonly logger = new Logger(SeriesService.name);

  constructor(
    private readonly tvShowRepository: SeriesRepository,
    private readonly contentGenresService: ContentGenresService,
    private readonly elasticsearchService: ElasticsearchContentService,
  ) {}

  /**
   * Create a new TV show
   * @param createSeriesDto - TV show data from request
   * @returns The created TV show with generated ID
   */
  async create(createSeriesDto: CreateSeriesDto): Promise<Series> {
    this.logger.log(`Creating new TV show: ${createSeriesDto.title}`);

    try {
      // Extract genre_ids from DTO (not a Series entity property)
      const { genre_ids, ...seriesFields } = createSeriesDto;

      // Auto-generate slug if not provided
      const slug = seriesFields.slug || generateSlug(createSeriesDto.title);
      this.logger.log(`Using slug: ${slug}`);

      // Transform DTO to entity format (convert date strings to Date objects)
      const tvShowData: Partial<Series> = {
        ...seriesFields,
        slug,
        release_date: createSeriesDto.release_date ? new Date(createSeriesDto.release_date) : undefined,
      };

      const tvShow = await this.tvShowRepository.create(tvShowData);
      this.logger.log(`TV show created successfully with ID: ${tvShow.content_id}`);

      // If genre_ids provided, assign genres to the series
      if (genre_ids && genre_ids.length > 0) {
        this.logger.log(`Assigning ${genre_ids.length} genres to series ${tvShow.content_id}`);
        await this.contentGenresService.updateGenres(tvShow.content_id, { genre_ids });
      }

      // Fetch and return the complete series with genres
      const createdSeries = await this.findOne(tvShow.content_id);

      // Index to Elasticsearch asynchronously
      this.elasticsearchService.indexContent(createdSeries).catch((error) => {
        this.logger.error(`Failed to index series to Elasticsearch: ${error.message}`);
      });

      return createdSeries;
    } catch (error) {
      this.logger.error(`Failed to create TV show: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all TV shows with pagination
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Tuple of [TV shows array, total count]
   */
  async findAll(page: number = 1, limit: number = 10): Promise<[Series[], number]> {
    // Enforce maximum limit to prevent performance issues
    const safeLimit = Math.min(limit, 100);
    this.logger.log(`Fetching TV shows - page: ${page}, limit: ${safeLimit}`);

    const [tvShows, total] = await this.tvShowRepository.findAllSeries(page, safeLimit);
    this.logger.log(`Found ${total} TV shows, returning page ${page}`);

    return [tvShows, total];
  }

  /**
   * Find TV shows by status (Ongoing/Ended/Cancelled)
   * @param status - Status filter
   * @param page - Page number
   * @param limit - Items per page
   * @returns Tuple of [TV shows array, total count]
   */
  async findByStatus(status: string, page: number = 1, limit: number = 10): Promise<[Series[], number]> {
    const safeLimit = Math.min(limit, 100);
    this.logger.log(`Fetching TV shows with status: ${status} - page: ${page}, limit: ${safeLimit}`);

    const [tvShows, total] = await this.tvShowRepository.findByStatus(status, page, safeLimit);
    this.logger.log(`Found ${total} TV shows with status ${status}`);

    return [tvShows, total];
  }

  /**
   * Find a single TV show by ID
   * @param id - TV show content_id
   * @returns TV show with all relations (including seasons)
   * @throws NotFoundException if TV show doesn't exist
   */
  async findOne(id: string): Promise<Series> {
    this.logger.log(`Fetching TV show with ID: ${id}`);

    const tvShow = await this.tvShowRepository.findById(id);

    if (!tvShow) {
      this.logger.warn(`TV show not found with ID: ${id}`);
      throw new NotFoundException(`TV show with ID ${id} not found`);
    }

    return tvShow;
  }

  /**
   * Update a TV show
   * @param id - TV show content_id
   * @param updateSeriesDto - Partial TV show data to update
   * @returns The updated TV show
   * @throws NotFoundException if TV show doesn't exist
   */
  async update(id: string, updateSeriesDto: UpdateSeriesDto): Promise<Series> {
    this.logger.log(`Updating TV show with ID: ${id}`);

    // Verify TV show exists before updating
    await this.findOne(id);

    try {
      // Extract genre_ids from DTO (not a Series entity property)
      const { genre_ids, ...seriesFields } = updateSeriesDto;

      // Only update series fields if there are any
      if (Object.keys(seriesFields).length > 0) {
        // Transform DTO to entity format (convert date strings to Date objects)
        const updateData: Partial<Series> = {
          ...seriesFields,
          release_date: updateSeriesDto.release_date ? new Date(updateSeriesDto.release_date) : undefined,
        };

        await this.tvShowRepository.update(id, updateData);
        this.logger.log(`TV show fields updated successfully: ${id}`);
      }

      // If genre_ids provided, update genres
      if (genre_ids !== undefined) {
        this.logger.log(`Updating genres for series ${id}`);
        await this.contentGenresService.updateGenres(id, { genre_ids });
      }

      // Fetch and return the complete updated series with all relations
      const updatedSeries = await this.findOne(id);

      // Update in Elasticsearch asynchronously
      this.elasticsearchService.updateContent(updatedSeries).catch((error) => {
        this.logger.error(`Failed to update series in Elasticsearch: ${error.message}`);
      });

      return updatedSeries;
    } catch (error) {
      this.logger.error(`Failed to update TV show ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a TV show
   * Cascade deletes will remove related seasons, episodes, ratings, assets, etc.
   * @param id - TV show content_id
   * @returns true if deleted successfully
   * @throws NotFoundException if TV show doesn't exist
   */
  async remove(id: string): Promise<boolean> {
    this.logger.log(`Deleting TV show with ID: ${id}`);

    // Verify TV show exists before deleting
    await this.findOne(id);

    try {
      const deleted = await this.tvShowRepository.delete(id);

      // Remove from Elasticsearch asynchronously
      this.elasticsearchService.removeContent(id).catch((error) => {
        this.logger.error(`Failed to remove series from Elasticsearch: ${error.message}`);
      });

      this.logger.log(`TV show deleted successfully: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete TV show ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a TV show exists
   * Useful for validation in other services (e.g., when creating seasons)
   * @param id - TV show content_id
   * @returns true if exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    return await this.tvShowRepository.exists(id);
  }

  /**
   * Find a single series by slug
   * @param slug - Series slug (e.g., 'breaking-bad-2008')
   * @returns Series with all relations (including seasons)
   * @throws NotFoundException if series doesn't exist
   */
  async findBySlug(slug: string): Promise<Series> {
    this.logger.log(`Fetching series with slug: ${slug}`);

    const series = await this.tvShowRepository.findBySlug(slug);

    if (!series) {
      this.logger.warn(`Series not found with slug: ${slug}`);
      throw new NotFoundException(`Series with slug '${slug}' not found`);
    }

    return series;
  }
}
