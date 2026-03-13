import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, UserRole, Public } from '@libs/common';
import { MoviesService } from './movies.service';
import { CreateMovieDto, UpdateMovieDto } from '../dto';

/**
 * REST API Controller for Movie operations
 * Handles HTTP requests and responses for movie endpoints
 *
 * Responsibilities:
 * - Define API routes and HTTP methods
 * - Validate request parameters and body
 * - Handle HTTP status codes and responses
 * - Document API with Swagger decorators
 *
 * Pattern: Controller Layer (MVC Pattern)
 * - Delegates business logic to MoviesService
 * - Focuses on HTTP concerns only
 *
 * Authentication:
 * - All endpoints require JWT authentication by default (via global guard)
 * - Read operations (GET) are public
 * - Write operations (POST, PATCH, DELETE) require ADMIN role
 */
@ApiTags('Movies')
@ApiBearerAuth()
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  /**
   * Create a new movie
   * POST /movies
   * @param createMovieDto - Movie data from request body
   * @returns Created movie with 201 status
   * @requires ADMIN role
   */
  @Post("create")
  @Roles(UserRole.ADMIN) // Only admins can create movies
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new movie (Admin only)' })
  @ApiResponse({ status: 201, description: 'Movie created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async create(@Body() createMovieDto: CreateMovieDto) {
    return await this.moviesService.create(createMovieDto);
  }

  /**
   * Get all movies with pagination
   * GET /movies?page=1&limit=10
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Object containing movies array and pagination metadata
   * @public No authentication required
   */
  @Get("all")
  @Public() // Public endpoint - no authentication required
  @ApiOperation({ summary: 'Get all movies with pagination (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiResponse({ status: 200, description: 'Movies retrieved successfully' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const [movies, total] = await this.moviesService.findAll(page, limit);

    // Transform genres structure to flatten it
    const transformedMovies = movies.map(movie => ({
      ...movie,
      genres: movie.genres?.map(cg => ({
        genre_id: cg.genre.genre_id,
        name: cg.genre.name,
      })) || [],
    }));

    // Return paginated response with metadata
    return {
      data: transformedMovies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single movie by ID
   * GET /movies/:id
   * @param id - Movie UUID
   * @returns Movie with all relations
   * @public No authentication required
   */
  @Get(':id')
  @Public() // Public endpoint - no authentication required
  @ApiOperation({ summary: 'Get a movie by ID (Public)' })
  @ApiParam({ name: 'id', description: 'Movie UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Movie found' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const movie = await this.moviesService.findOne(id);

    // Transform genres structure to flatten it
    return {
      ...movie,
      genres: movie.genres?.map(cg => ({
        genre_id: cg.genre.genre_id,
        name: cg.genre.name,
      })) || [],
    };
  }

  /**
   * Update a movie
   * PATCH /movies/:id
   * @param id - Movie UUID
   * @param updateMovieDto - Partial movie data to update
   * @returns Updated movie
   * @requires ADMIN role
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN) // Only admins can update movies
  @ApiOperation({ summary: 'Update a movie (Admin only)' })
  @ApiParam({ name: 'id', description: 'Movie UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Movie updated successfully' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMovieDto: UpdateMovieDto,
  ) {
    return await this.moviesService.update(id, updateMovieDto);
  }

  /**
   * Delete a movie
   * DELETE /movies/:id
   * Cascade deletes related ratings, assets, etc.
   * @param id - Movie UUID
   * @returns Success message with 204 status
   * @requires ADMIN role
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN) // Only admins can delete movies
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a movie (Admin only)' })
  @ApiParam({ name: 'id', description: 'Movie UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 204, description: 'Movie deleted successfully' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.moviesService.remove(id);
  }

  /**
   * Get a single movie by slug
   * GET /movies/slug/:slug
   * @param slug - Movie slug (e.g., 'inception-2010')
   * @returns Movie with all relations
   * @public No authentication required
   */
  @Get('slug/:slug')
  @Public() // Public endpoint - no authentication required
  @ApiOperation({ summary: 'Get a movie by slug (Public)' })
  @ApiParam({ name: 'slug', description: 'Movie slug', example: 'inception-2010' })
  @ApiResponse({ status: 200, description: 'Movie found' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async findBySlug(@Param('slug') slug: string) {
    const movie = await this.moviesService.findBySlug(slug);

    // Transform genres structure to flatten it
    return {
      ...movie,
      genres: movie.genres?.map(cg => ({
        genre_id: cg.genre.genre_id,
        name: cg.genre.name,
      })) || [],
    };
  }
}
