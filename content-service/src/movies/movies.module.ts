import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { MovieRepository } from '../repository/movie.repository';
import { Movie } from '../entities/movie.entity';
import { ContentGenresModule } from '../content-genres/content-genres.module';
import { MovieCreditsModule } from '../movie-credits/movie-credits.module';
import { ElasticsearchContentModule } from '../elasticsearch/elasticsearch.module';

/**
 * Movies Module
 * Encapsulates all movie-related functionality
 *
 * Module Structure:
 * - Imports: TypeOrmModule for Movie entity, ContentGenresModule for genre management, MovieCreditsModule for cast/crew, Elasticsearch for indexing
 * - Controllers: MoviesController for HTTP endpoints
 * - Providers: MoviesService for business logic, MovieRepository for data access
 * - Exports: MoviesService (for use in other modules if needed)
 *
 * Pattern: Feature Module (NestJS Module Pattern)
 * - Self-contained feature with its own controllers, services, and repositories
 * - Can be imported by other modules or lazy-loaded
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Movie]), // Register Movie entity for dependency injection
    ContentGenresModule, // Import for genre management
    MovieCreditsModule, // Import for cast/crew management
    ElasticsearchContentModule, // Import for search indexing
  ],
  controllers: [MoviesController],
  providers: [MoviesService, MovieRepository],
  exports: [MoviesService], // Export service for use in other modules
})
export class MoviesModule {}
