import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ContentItem } from '../entities/content-item.entity';
import { Movie } from '../entities/movie.entity';
import { Series } from '../entities/series.entity';
import { Person } from '../entities/person.entity';
import { ElasticsearchContentModule } from '../elasticsearch/elasticsearch.module';

/**
 * Search & Discovery Module
 * Provides advanced search, filtering, and recommendation features
 * Integrates Elasticsearch for robust full-text search
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentItem,
      Movie,
      Series,
      Person,
    ]),
    ElasticsearchContentModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService], // Export for use in other modules if needed
})
export class SearchModule {}
