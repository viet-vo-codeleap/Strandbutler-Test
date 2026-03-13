import { Controller, Post, Delete, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, UserRole } from '@libs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem } from '../entities/content-item.entity';
import { ElasticsearchContentService } from './elasticsearch-content.service';

/**
 * Elasticsearch Indexing Controller
 * Admin endpoints for managing Elasticsearch indices
 * Provides bulk indexing and reindexing capabilities
 */
@ApiTags('Elasticsearch Admin')
@ApiBearerAuth()
@Controller('elasticsearch')
export class ElasticsearchIndexingController {
  private readonly logger = new Logger(ElasticsearchIndexingController.name);

  constructor(
    @InjectRepository(ContentItem)
    private readonly contentRepository: Repository<ContentItem>,
    private readonly elasticsearchService: ElasticsearchContentService,
  ) {}

  /**
   * Bulk index all existing content into Elasticsearch
   * POST /elasticsearch/index-all
   * Admin only - this can be resource intensive
   */
  @Post('index-all')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk index all content to Elasticsearch (Admin only)',
    description: 'Indexes all existing movies and series into Elasticsearch. Use this after setting up Elasticsearch or when rebuilding the index.',
  })
  @ApiResponse({ status: 200, description: 'Indexing completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 500, description: 'Indexing failed' })
  async bulkIndexAll() {
    this.logger.log('Starting bulk indexing of all content...');
    const startTime = Date.now();

    try {
      // Fetch all content with relations needed for indexing
      const allContent = await this.contentRepository.find({
        relations: ['genres', 'genres.genre', 'assets', 'ratings'],
      });

      this.logger.log(`Found ${allContent.length} content items to index`);

      if (allContent.length === 0) {
        return {
          message: 'No content found to index',
          indexed: 0,
          duration: 0,
        };
      }

      // Bulk index in batches for better performance
      const batchSize = 100;
      let totalIndexed = 0;

      for (let i = 0; i < allContent.length; i += batchSize) {
        const batch = allContent.slice(i, i + batchSize);
        await this.elasticsearchService.bulkIndexContent(batch);
        totalIndexed += batch.length;
        this.logger.log(`Indexed ${totalIndexed}/${allContent.length} items`);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Bulk indexing completed in ${duration}ms`);

      return {
        message: 'Bulk indexing completed successfully',
        indexed: totalIndexed,
        duration,
      };
    } catch (error) {
      this.logger.error(`Bulk indexing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Recreate Elasticsearch index from scratch
   * DELETE + POST /elasticsearch/reindex
   * Admin only - this will delete all indexed data and rebuild
   */
  @Post('reindex')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recreate and reindex Elasticsearch (Admin only)',
    description: 'Deletes the existing index, creates a new one with updated mapping, and reindexes all content. Use this when changing index mappings.',
  })
  @ApiResponse({ status: 200, description: 'Reindexing completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 500, description: 'Reindexing failed' })
  async reindexAll() {
    this.logger.log('Starting full reindex (delete + create + bulk index)...');
    const startTime = Date.now();

    try {
      // Step 1: Delete and recreate index
      await this.elasticsearchService.reindexAll();

      // Step 2: Bulk index all content
      const allContent = await this.contentRepository.find({
        relations: ['genres', 'genres.genre', 'assets', 'ratings'],
      });

      this.logger.log(`Reindexing ${allContent.length} content items...`);

      if (allContent.length > 0) {
        const batchSize = 100;
        let totalIndexed = 0;

        for (let i = 0; i < allContent.length; i += batchSize) {
          const batch = allContent.slice(i, i + batchSize);
          await this.elasticsearchService.bulkIndexContent(batch);
          totalIndexed += batch.length;
          this.logger.log(`Reindexed ${totalIndexed}/${allContent.length} items`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Full reindex completed in ${duration}ms`);

      return {
        message: 'Reindexing completed successfully',
        indexed: allContent.length,
        duration,
      };
    } catch (error) {
      this.logger.error(`Reindexing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Health check for Elasticsearch connection
   * GET /elasticsearch/health
   */
  @Post('health')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check Elasticsearch health (Admin only)',
    description: 'Verifies that Elasticsearch is accessible and the content index exists.',
  })
  @ApiResponse({ status: 200, description: 'Elasticsearch is healthy' })
  @ApiResponse({ status: 503, description: 'Elasticsearch is unavailable' })
  async checkHealth() {
    try {
      // This will throw an error if Elasticsearch is not available
      const health = await this.elasticsearchService['elasticsearchService'].ping();

      return {
        status: 'healthy',
        message: 'Elasticsearch is accessible',
        healthy: health, 
      };
    } catch (error) {
      this.logger.error(`Elasticsearch health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        message: error.message,
      };
    }
  }
}
