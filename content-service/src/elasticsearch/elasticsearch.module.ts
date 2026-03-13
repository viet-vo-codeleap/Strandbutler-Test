import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ElasticsearchContentService } from './elasticsearch-content.service';
import { ElasticsearchIndexingController } from './elasticsearch-indexing.controller';
import { elasticsearchConfig } from './elasticsearch.config';
import { ContentItem } from '../entities/content-item.entity';

/**
 * Elasticsearch Module
 * Configures Elasticsearch client and provides content indexing/search services
 * Includes admin endpoints for bulk indexing and reindexing
 */
@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: elasticsearchConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ContentItem]),
  ],
  controllers: [ElasticsearchIndexingController],
  providers: [ElasticsearchContentService],
  exports: [ElasticsearchContentService, ElasticsearchModule],
})
export class ElasticsearchContentModule {}
