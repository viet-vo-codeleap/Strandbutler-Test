import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { ContentItem } from '../entities/content-item.entity';
import { Movie } from '../entities/movie.entity';
import { Series } from '../entities/series.entity';
import { Person } from '../entities/person.entity';
import {
  SearchContentDto,
  SearchSuggestionsDto,
  TrendingDto,
  RecommendationsDto,
  ContentType,
  SortBy,
} from '../dto/search.dto';
import { ElasticsearchContentService } from '../elasticsearch/elasticsearch-content.service';

/**
 * Search & Discovery Service
 * Provides advanced search, filtering, sorting, and recommendation features
 * Uses Elasticsearch for full-text search and PostgreSQL for structured queries
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly useElasticsearch: boolean = true; // Feature flag

  constructor(
    @InjectRepository(ContentItem)
    private readonly contentRepository: Repository<ContentItem>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly elasticsearchContentService: ElasticsearchContentService,
  ) {}

  /**
   * Advanced content search with multiple filters
   * Searches across titles, descriptions, and supports genre/year/rating filters
   * Uses Elasticsearch for better performance and relevance ranking
   */
  async searchContent(dto: SearchContentDto): Promise<{ data: ContentItem[]; total: number }> {
    this.logger.log(`Searching content with query: ${dto.query || '(no query)'}, type: ${dto.type}`);
    // assert what elasticsearch or query is none
    this.logger.log('Use Elasticsearch:', this.useElasticsearch, 'Query:', dto.query);
    // Use Elasticsearch if enabled and query is provided
    if (this.useElasticsearch && dto.query) {
      try {
        // Parse years from comma-separated string
        const yearsArray = dto.years ? dto.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y)) : undefined;
        // Parse genres from comma-separated string
        const genresArray = dto.genres ? dto.genres.split(',').map(g => parseInt(g.trim(), 10)).filter(g => !isNaN(g)) : undefined;

        const { hits, total } = await this.elasticsearchContentService.searchContent({
          searchTerm: dto.query,
          contentType: dto.type === ContentType.ALL ? undefined : dto.type,
          genres: genresArray,
          years: yearsArray,
          minRating: dto.minRating,
          ageRating: dto.ageRating,
          page: dto.page,
          limit: dto.limit,
        });

        this.logger.log(`Elasticsearch returned ${hits.length} hits, total: ${total}`);

        // If we got results from Elasticsearch, fetch full entities from database
        if (hits.length > 0) {
          const contentIds = hits.map((hit: any) => hit.content_id);
          const contents = await this.contentRepository.find({
            where: { content_id: In(contentIds) },
            relations: ['genres', 'genres.genre', 'assets', 'ratings'],
          });

          // Sort contents to match Elasticsearch order (by relevance score)
          const orderedContents = contentIds
            .map((id) => contents.find((c) => c.content_id === id))
            .filter((c) => c !== undefined);

          this.logger.log(`Found ${total} results using Elasticsearch`);
          return { data: orderedContents, total };
        } else {
          this.logger.log(`Elasticsearch returned 0 results, falling back to PostgreSQL`);
        }
      } catch (error) {
        this.logger.error(`Elasticsearch search failed, falling back to PostgreSQL: ${error.message}`);
        // Fall through to PostgreSQL search
      }
    }

    // Fallback to PostgreSQL search (or when no query is provided)
    this.logger.log(`Using PostgreSQL search (fallback or no query provided)`);
    const qb = this.buildSearchQuery(dto);

    // Apply sorting
    this.applySorting(qb, dto.sortBy || SortBy.RELEVANCE, dto.query);

    // Apply pagination
    const skip = ((dto.page || 1) - 1) * (dto.limit || 20);
    qb.skip(skip).take(dto.limit || 20);

    const [data, total] = await qb.getManyAndCount();

    this.logger.log(`Found ${total} results using PostgreSQL`);
    return { data, total };
  }

  /**
   * Get search suggestions for autocomplete
   * Returns quick results based on partial query
   * Uses Elasticsearch autocomplete analyzer for better suggestions
   */
  async getSearchSuggestions(dto: SearchSuggestionsDto): Promise<Array<{ id: string; title: string; type: string }>> {
    this.logger.log(`Getting search suggestions for: ${dto.query}`);

    // Use Elasticsearch if enabled
    if (this.useElasticsearch && dto.query) {
      try {
        const suggestions = await this.elasticsearchContentService.getSuggestions(
          dto.query,
          dto.type === ContentType.ALL ? undefined : dto.type,
          dto.limit || 5,
        );

        if (suggestions.length > 0) {
          this.logger.log(`Found ${suggestions.length} suggestions using Elasticsearch`);
          return suggestions;
        }
      } catch (error) {
        this.logger.error(`Elasticsearch suggestions failed, falling back to PostgreSQL: ${error.message}`);
        // Fall through to PostgreSQL
      }
    }

    // Fallback to PostgreSQL
    const qb = this.contentRepository
      .createQueryBuilder('content')
      .select(['content.content_id', 'content.title', 'content.content_type']);

    // Filter by content type
    if (dto.type && dto.type !== ContentType.ALL) {
      qb.andWhere('content.content_type = :type', { type: dto.type });
    }

    // Search by title (case-insensitive partial match)
    if (dto.query) {
      qb.andWhere('content.title ILIKE :query', { query: `%${dto.query}%` });
    }

    // Sort by relevance (exact matches first)
    qb.orderBy('content.title', 'ASC').limit(dto.limit || 5);

    const results = await qb.getRawMany();

    return results.map((item) => ({
      id: item.content_content_id,
      title: item.content_title,
      type: item.content_content_type,
    }));
  }

  /**
   * Get trending content
   * Based on recent releases and high ratings
   */
  async getTrendingContent(dto: TrendingDto): Promise<ContentItem[]> {
    this.logger.log(`Getting trending content of type: ${dto.type}`);

    const qb = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.genres', 'contentGenre')
      .leftJoinAndSelect('contentGenre.genre', 'genre')
      .leftJoinAndSelect('content.assets', 'assets')
      .leftJoinAndSelect('content.ratings', 'ratings');

    // Filter by content type
    if (dto.type && dto.type !== ContentType.ALL) {
      qb.andWhere('content.content_type = :type', { type: dto.type });
    }

    // Get content from last 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    qb.andWhere('content.release_date >= :date', { date: twoYearsAgo });

    // Sort by release date (newest first)
    qb.orderBy('content.release_date', 'DESC')
      .addOrderBy('content.created_at', 'DESC')
      .limit(dto.limit || 10);

    const results = await qb.getMany();
    this.logger.log(`Found ${results.length} trending items`);

    return results;
  }

  /**
   * Get content recommendations
   * Based on genres or similar to a specific content item
   */
  async getRecommendations(dto: RecommendationsDto): Promise<ContentItem[]> {
    this.logger.log(`Getting recommendations based on contentId: ${dto.contentId}, genres: ${dto.genres}`);

    const qb = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.genres', 'contentGenre')
      .leftJoinAndSelect('contentGenre.genre', 'genre')
      .leftJoinAndSelect('content.assets', 'assets')
      .leftJoinAndSelect('content.ratings', 'ratings');

    // If contentId provided, get similar content
    if (dto.contentId) {
      // First, fetch the source content to get its genres
      const sourceContent = await this.contentRepository.findOne({
        where: { content_id: dto.contentId },
        relations: ['genres', 'genres.genre'],
      });

      if (sourceContent && sourceContent.genres.length > 0) {
        const genreIds = sourceContent.genres.map((cg) => cg.genre.genre_id);
        qb.andWhere('genre.genre_id IN (:...genreIds)', { genreIds });
        qb.andWhere('content.content_id != :contentId', { contentId: dto.contentId });
      }
    }
    // Otherwise, use provided genres
    else if (dto.genres && dto.genres.length > 0) {
      qb.andWhere('genre.genre_id IN (:...genreIds)', { genreIds: dto.genres });
    }

    // Filter by content type
    if (dto.type && dto.type !== ContentType.ALL) {
      qb.andWhere('content.content_type = :type', { type: dto.type });
    }

    // Sort by release date (newest first)
    qb.orderBy('content.release_date', 'DESC').limit(dto.limit || 10);

    const results = await qb.getMany();
    this.logger.log(`Found ${results.length} recommendations`);

    return results;
  }

  /**
   * Search for persons (actors, directors, etc.)
   */
  async searchPersons(query: string, limit: number = 10): Promise<Person[]> {
    this.logger.log(`Searching persons with query: ${query}`);

    const qb = this.personRepository
      .createQueryBuilder('person')
      .where('person.name ILIKE :query', { query: `%${query}%` })
      .orderBy('person.name', 'ASC')
      .limit(limit);

    return await qb.getMany();
  }

  /**
   * Build base search query with all filters applied
   */
  private buildSearchQuery(dto: SearchContentDto): SelectQueryBuilder<ContentItem> {
    const qb = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.genres', 'contentGenre')
      .leftJoinAndSelect('contentGenre.genre', 'genre')
      .leftJoinAndSelect('content.assets', 'assets')
      .leftJoinAndSelect('content.ratings', 'ratings');

    // Filter by content type (movie/series)
    if (dto.type && dto.type !== ContentType.ALL) {
      qb.andWhere('content.content_type = :type', { type: dto.type });
    }

    // Search by query (title and description)
    if (dto.query) {
      qb.andWhere(
        '(content.title ILIKE :query OR content.description ILIKE :query)',
        { query: `%${dto.query}%` }
      );
    }

    // Filter by genres
    if (dto.genres) {
      const genresArray = dto.genres.split(',').map(g => parseInt(g.trim(), 10)).filter(g => !isNaN(g));
      if (genresArray.length > 0) {
        qb.andWhere('genre.genre_id IN (:...genreIds)', { genreIds: genresArray });
      }
    }

    // Filter by specific years
    if (dto.years) {
      const yearsArray = dto.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
      if (yearsArray.length > 0) {
        qb.andWhere('EXTRACT(YEAR FROM content.release_date) IN (:...years)', { years: yearsArray });
      }
    }

    // Filter by minimum rating (if ratings exist)
    if (dto.minRating !== undefined) {
      qb.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('AVG(r.rating)', 'avg_rating')
          .from('content_ratings', 'r')
          .where('r.content_id = content.content_id')
          .getQuery();
        return `(${subQuery}) >= :minRating`;
      });
      qb.setParameter('minRating', dto.minRating);
    }

    // Filter by age rating
    if (dto.ageRating) {
      qb.andWhere('content.age_rating = :ageRating', { ageRating: dto.ageRating });
    }

    return qb;
  }

  /**
   * Apply sorting to query based on selected sort option
   */
  private applySorting(qb: SelectQueryBuilder<ContentItem>, sortBy: SortBy, query?: string) {
    switch (sortBy) {
      case SortBy.TITLE_ASC:
        qb.orderBy('content.title', 'ASC');
        break;

      case SortBy.TITLE_DESC:
        qb.orderBy('content.title', 'DESC');
        break;

      case SortBy.RELEASE_DATE_ASC:
        qb.orderBy('content.release_date', 'ASC');
        break;

      case SortBy.RELEASE_DATE_DESC:
        qb.orderBy('content.release_date', 'DESC');
        break;

      case SortBy.RATING_ASC:
      case SortBy.RATING_DESC:
        // Add subquery for average rating
        qb.addSelect((subQuery) => {
          return subQuery
            .select('AVG(r.rating)', 'avg_rating')
            .from('content_ratings', 'r')
            .where('r.content_id = content.content_id');
        }, 'avg_rating');
        qb.orderBy('avg_rating', sortBy === SortBy.RATING_DESC ? 'DESC' : 'ASC', 'NULLS LAST');
        break;

      case SortBy.POPULARITY:
        // For now, sort by created_at (newest first) as a proxy for popularity
        // TODO: Add view_count or popularity_score field
        qb.orderBy('content.created_at', 'DESC');
        break;

      case SortBy.RELEVANCE:
      default:
        // If there's a search query, sort by relevance (exact title match first)
        if (query) {
          qb.addSelect(
            `CASE
              WHEN content.title ILIKE :exactQuery THEN 1
              WHEN content.title ILIKE :startsQuery THEN 2
              ELSE 3
            END`,
            'relevance_score'
          );
          qb.setParameter('exactQuery', query);
          qb.setParameter('startsQuery', `${query}%`);
          qb.orderBy('relevance_score', 'ASC');
        } else {
          // No query, default to newest first
          qb.orderBy('content.release_date', 'DESC');
        }
        break;
    }
  }
}
