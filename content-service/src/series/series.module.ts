import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { SeriesRepository } from '../repository/series.repository';
import { Series } from '../entities/series.entity';
import { ContentGenresModule } from '../content-genres/content-genres.module';
import { ElasticsearchContentModule } from '../elasticsearch/elasticsearch.module';

/**
 * Series Module
 * Encapsulates all series-related functionality
 *
 * Module Structure:
 * - Imports: TypeOrmModule for Series entity, ContentGenresModule for genre management, Elasticsearch for indexing
 * - Controllers: SeriesController for HTTP endpoints
 * - Providers: SeriesService for business logic, SeriesRepository for data access
 * - Exports: SeriesService (for use in other modules like seasons/episodes)
 *
 * Pattern: Feature Module (NestJS Module Pattern)
 * - Self-contained feature module
 * - Can be imported by app.module or other feature modules
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Series]), // Register Series entity for dependency injection
    ContentGenresModule, // Import for genre management
    ElasticsearchContentModule, // Import for search indexing
  ],
  controllers: [SeriesController],
  providers: [SeriesService, SeriesRepository],
  exports: [SeriesService], // Export service for use in seasons/episodes modules
})
export class SeriesModule {}
