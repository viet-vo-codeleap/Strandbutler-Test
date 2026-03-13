import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '@libs/common';
import { SearchService } from './search.service';
import {
  SearchContentDto,
  SearchSuggestionsDto,
  TrendingDto,
  RecommendationsDto,
  ContentType,
  SortBy,
} from '../dto/search.dto';

/**
 * Search & Discovery Controller
 * Public endpoints for content discovery, search, trending, and recommendations
 */
@ApiTags('Search & Discovery')
@Controller('search')
@Public() // All search endpoints are public
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  /**
   * Advanced content search
   * GET /search?query=breaking&type=series&genres=1,2&years=2025,2024,2022&sortBy=rating_desc
   *
   * Supports:
   * - Full-text search on title and description
   * - Multiple filters (type, genres, year range, rating, age rating)
   * - Multiple sort options (relevance, title, date, rating, popularity)
   * - Pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search content with advanced filters',
    description: 'Search for movies and series with multiple filter options including genre, year, rating, and more.',
  })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search term', example: 'breaking bad' })
  @ApiQuery({ name: 'type', required: false, enum: ContentType, description: 'Content type filter' })
  @ApiQuery({ name: 'genres', required: false, type: String, description: 'Comma-separated list of genre IDs', example: '1,2,3' })
  @ApiQuery({ name: 'years', required: false, type: String, description: 'Comma-separated list of years', example: '2025,2024,2022,2021' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Minimum rating (0-10)', example: 7.5 })
  @ApiQuery({ name: 'ageRating', required: false, type: String, description: 'Age rating', example: 'PG-13' })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortBy, description: 'Sort option' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)', example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination metadata',
    schema: {
      example: {
        data: [
          {
            content_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Breaking Bad',
            type: 'series',
            description: 'A high school chemistry teacher...',
            release_date: '2008-01-20',
            age_rating: 'TV-MA',
            genres: [{ genre: { name: 'Drama' } }],
            assets: [],
            ratings: [],
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 45,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  async search(@Query() dto: SearchContentDto) {
    const { data, total } = await this.searchService.searchContent(dto);

    const page = dto.page || 1;
    const limit = dto.limit || 20;

    // Map data to include the 'type' getter value in the JSON response
    const dataWithType = data.map((item) => ({
      ...item,
      type: item.type, // Explicitly include the getter value
    }));

    return {
      data: dataWithType,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        filters: {
          query: dto.query,
          type: dto.type,
          genres: dto.genres,
          years: dto.years,
          minRating: dto.minRating,
          ageRating: dto.ageRating,
          sortBy: dto.sortBy,
        },
      },
    };
  }

  /**
   * Search suggestions for autocomplete
   * GET /search/suggestions?query=break&limit=5
   *
   * Returns quick suggestions based on partial query
   * Useful for autocomplete/typeahead features
   */
  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get search suggestions for autocomplete',
    description: 'Returns quick suggestions based on partial search query. Ideal for typeahead/autocomplete features.',
  })
  @ApiQuery({ name: 'query', required: true, type: String, description: 'Partial search term', example: 'break' })
  @ApiQuery({ name: 'type', required: false, enum: ContentType, description: 'Content type filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max suggestions (max 20)', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'List of search suggestions',
    schema: {
      example: [
        { id: '550e8400-e29b-41d4-a716-446655440000', title: 'Breaking Bad', type: 'series' },
        { id: '660e8400-e29b-41d4-a716-446655440001', title: 'Breaking Away', type: 'movie' },
      ],
    },
  })
  async getSuggestions(@Query() dto: SearchSuggestionsDto) {
    return await this.searchService.getSearchSuggestions(dto);
  }

  /**
   * Get trending content
   * GET /search/trending?type=movie&limit=10
   *
   * Returns currently trending content based on:
   * - Recent releases (last 2 years)
   * - High ratings
   */
  @Get('trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get trending content',
    description: 'Returns currently trending movies and series based on recent releases and popularity.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ContentType, description: 'Content type filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items (max 50)', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of trending content',
    schema: {
      example: {
        data: [
          {
            content_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'The Last of Us',
            type: 'series',
            release_date: '2023-01-15',
            genres: [{ genre: { name: 'Drama' } }],
          },
        ],
      },
    },
  })
  async getTrending(@Query() dto: TrendingDto) {
    const data = await this.searchService.getTrendingContent(dto);
    return { data };
  }

  /**
   * Get personalized recommendations
   * GET /search/recommendations?contentId=xxx
   * GET /search/recommendations?genres=1,2,3
   *
   * Returns recommendations based on:
   * - Similar content (same genres)
   * - Provided content ID or genre IDs
   */
  @Get('recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get content recommendations',
    description: 'Returns personalized recommendations based on a content item or genre preferences.',
  })
  @ApiQuery({ name: 'contentId', required: false, type: String, description: 'Base recommendations on this content ID' })
  @ApiQuery({ name: 'genres', required: false, type: [Number], description: 'Genre IDs to base recommendations on' })
  @ApiQuery({ name: 'type', required: false, enum: ContentType, description: 'Content type filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (max 50)', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of recommended content',
    schema: {
      example: {
        data: [
          {
            content_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Better Call Saul',
            type: 'series',
            genres: [{ genre: { name: 'Drama' } }],
          },
        ],
      },
    },
  })
  async getRecommendations(@Query() dto: RecommendationsDto) {
    const data = await this.searchService.getRecommendations(dto);
    return { data };
  }

  /**
   * Search for persons (actors, directors, crew)
   * GET /search/persons?query=bryan&limit=10
   */
  @Get('persons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search for persons (cast & crew)',
    description: 'Search for actors, directors, writers, and other crew members.',
  })
  @ApiQuery({ name: 'query', required: true, type: String, description: 'Person name search', example: 'bryan cranston' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of matching persons',
    schema: {
      example: {
        data: [
          {
            person_id: '1',
            name: 'Bryan Cranston',
            date_of_birth: '1956-03-07',
            biography: 'American actor...',
          },
        ],
      },
    },
  })
  async searchPersons(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.searchService.searchPersons(query, limit);
    return { data };
  }
}
