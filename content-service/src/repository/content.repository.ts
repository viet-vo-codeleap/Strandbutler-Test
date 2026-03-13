import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem } from '../entities/content-item.entity';

/**
 * Repository for managing ContentItem entities (base class for all content types)
 * Handles database operations for movies and TV shows through polymorphic queries
 */
@Injectable()
export class ContentRepository {
  protected readonly logger = new Logger(ContentRepository.name);

  constructor(
    @InjectRepository(ContentItem)
    private readonly contentRepository: Repository<ContentItem>,
  ) {}

  /**
   * Find a content item by its unique ID
   * @param id - The UUID of the content item
   * @returns The content item with all related data (genres, assets, ratings) or null if not found
   */
  async findById(id: string): Promise<ContentItem | null> {
    return await this.contentRepository.findOne({
      where: { content_id: id },
      relations: ['genres', 'assets', 'ratings'],
    });
  }

  /**
   * Find all content items with optional filtering and pagination
   * Supports searching by title, filtering by genre and age rating
   * @param options - Query options including filters and pagination
   * @param options.title - Partial title match (case-insensitive)
   * @param options.genre_id - Filter by genre ID
   * @param options.age_rating - Filter by exact age rating (e.g., 'PG-13', 'R')
   * @param options.page - Page number for pagination (default: 1)
   * @param options.limit - Number of items per page (default: 10)
   * @returns Tuple of [content items array, total count]
   */
  async findAll(options?: {
    title?: string;
    genre_id?: number;
    age_rating?: string;
    page?: number;
    limit?: number;
  }): Promise<[ContentItem[], number]> {
    // Build query with QueryBuilder for complex filtering
    const qb = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.genres', 'contentGenre') // Join content-genre junction table
      .leftJoinAndSelect('contentGenre.genre', 'genre') // Join actual genre data
      .leftJoinAndSelect('content.assets', 'assets') // Join media assets (posters, trailers, etc.)
      .skip(((options?.page || 1) - 1) * (options?.limit || 10)) // Calculate offset for pagination
      .take(options?.limit || 10); // Limit results per page

    // Apply title filter with case-insensitive partial match
    if (options?.title) {
      qb.andWhere('content.title ILIKE :title', {
        title: `%${options.title}%`,
      });
    }

    // Apply age rating filter (exact match)
    if (options?.age_rating) {
      qb.andWhere('content.age_rating = :age_rating', {
        age_rating: options.age_rating,
      });
    }

    // Apply genre filter through the junction table
    if (options?.genre_id) {
      qb.andWhere('genre.genre_id = :genre_id', { genre_id: options.genre_id });
    }

    return await qb.getManyAndCount();
  }

  /**
   * Delete a content item by ID
   * Note: Related entities (ratings, assets, etc.) will be cascade deleted based on entity relationships
   * @param id - The UUID of the content item to delete
   * @returns true if deletion was successful, false if item was not found
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.contentRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
