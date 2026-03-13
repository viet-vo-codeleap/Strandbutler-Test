import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ContentItem } from '../entities/content-item.entity';
import { Movie } from '../entities/movie.entity';
import { Series } from '../entities/series.entity';

/**
 * Elasticsearch Content Service
 * Handles indexing and searching content items in Elasticsearch
 * Provides full-text search, fuzzy matching, and advanced search capabilities
 */
@Injectable()
export class ElasticsearchContentService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchContentService.name);
  private readonly indexName: string;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    const prefix = this.configService.get<string>('ELASTICSEARCH_INDEX_PREFIX', 'flixzone');
    this.indexName = `${prefix}_content`;
  }

  /**
   * Initialize Elasticsearch index on module startup
   * Creates index with mapping if it doesn't exist
   */
  async onModuleInit() {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({
        index: this.indexName,
      });

      if (!indexExists) {
        this.logger.log(`Creating Elasticsearch index: ${this.indexName}`);
        await this.createIndex();
      } else {
        this.logger.log(`Elasticsearch index already exists: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Elasticsearch index: ${error.message}`, error.stack);
    }
  }

  /**
   * Create Elasticsearch index with optimized mapping for content search
   */
  private async createIndex() {
    await this.elasticsearchService.indices.create({
      index: this.indexName,
      settings: {
        analysis: {
          analyzer: {
            // Custom analyzer for better title matching
            title_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'english_stop', 'word_delimiter'],
            },
            // Autocomplete analyzer
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'english_stop', 'edge_ngram_filter'],
            },
          },
          filter: {
            english_stop: {
              type: 'stop',
              stopwords: '_english_',  // Removes: the, and, a, an, or, but, etc.
            },
            edge_ngram_filter: {
              type: 'edge_ngram',
              min_gram: 2,
              max_gram: 20,
            },
          },
        },
      },
      mappings: {
        properties: {
          content_id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'title_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              autocomplete: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
              },
            },
          },
          description: {
            type: 'text',
            analyzer: 'standard',
          },
          content_type: { type: 'keyword' },
          release_date: { type: 'date' },
          age_rating: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          // Movie-specific fields
          duration_minutes: { type: 'integer' },
          // Series-specific fields
          series_status: { type: 'keyword' },
          // Nested genre objects
          genres: {
            type: 'nested',
            properties: {
              genre_id: { type: 'integer' },
              name: { type: 'keyword' },
            },
          },
          // Average rating (denormalized for faster search)
          average_rating: { type: 'float' },
          // Slug for URL
          slug: { type: 'keyword' },
          // Asset URLs
          poster_url: { type: 'keyword', index: false },
          backdrop_url: { type: 'keyword', index: false },
        },
      },
    });

    this.logger.log(`Successfully created index: ${this.indexName}`);
  }

  /**
   * Index a single content item
   * Converts content entity to Elasticsearch document
   */
  async indexContent(content: ContentItem | Movie | Series): Promise<void> {
    try {
      const document = this.prepareDocument(content);

      await this.elasticsearchService.index({
        index: this.indexName,
        id: content.content_id,
        document,
      });

      this.logger.debug(`Indexed content: ${content.content_id} - ${content.title}`);
    } catch (error) {
      this.logger.error(`Failed to index content ${content.content_id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk index multiple content items
   * More efficient than indexing one at a time
   */
  async bulkIndexContent(contents: ContentItem[]): Promise<void> {
    if (contents.length === 0) return;

    try {
      const operations = contents.flatMap((content) => [
        { index: { _index: this.indexName, _id: content.content_id } },
        this.prepareDocument(content),
      ]);

      const bulkResponse = await this.elasticsearchService.bulk({
        operations,
        refresh: true,
      });

      if (bulkResponse.errors) {
        const erroredDocuments = bulkResponse.items.filter((item: any) => item.index?.error);
        this.logger.error(`Bulk indexing had errors: ${JSON.stringify(erroredDocuments)}`);
      } else {
        this.logger.log(`Successfully bulk indexed ${contents.length} content items`);
      }
    } catch (error) {
      this.logger.error(`Failed to bulk index content: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a content item in the index
   */
  async updateContent(content: ContentItem | Movie | Series): Promise<void> {
    try {
      const document = this.prepareDocument(content);

      await this.elasticsearchService.update({
        index: this.indexName,
        id: content.content_id,
        doc: document,
      });

      this.logger.debug(`Updated content: ${content.content_id}`);
    } catch (error) {
      this.logger.error(`Failed to update content ${content.content_id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a content item from the index
   */
  async removeContent(contentId: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id: contentId,
      });

      this.logger.debug(`Removed content: ${contentId}`);
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        this.logger.warn(`Content ${contentId} not found in index, skipping deletion`);
        return;
      }
      this.logger.error(`Failed to remove content ${contentId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search content with advanced Elasticsearch query
   */
  async searchContent(query: {
    searchTerm?: string;
    contentType?: 'movie' | 'series' | 'all';
    genres?: number[];
    years?: number[];
    minRating?: number;
    ageRating?: string;
    page?: number;
    limit?: number;
  }): Promise<{ hits: any[]; total: number }> {
    const { searchTerm, contentType, genres, years, minRating, ageRating, page = 1, limit = 20 } = query;

    // Build Elasticsearch query
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search with multi-match
    if (searchTerm) {
      must.push({
        multi_match: {
          query: searchTerm,
          fields: ['title^3', 'description', 'title.autocomplete^2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Filter by content type
    if (contentType && contentType !== 'all') {
      filter.push({ term: { content_type: contentType } });
    }

    // Filter by genres (nested query)
    if (genres && genres.length > 0) {
      filter.push({
        nested: {
          path: 'genres',
          query: {
            terms: { 'genres.genre_id': genres },
          },
        },
      });
    }

    // Filter by specific years
    if (years && years.length > 0) {
      // Create a should clause with date ranges for each year
      const yearQueries = years.map(year => ({
        range: {
          release_date: {
            gte: `${year}-01-01`,
            lte: `${year}-12-31`,
          },
        },
      }));
      filter.push({
        bool: {
          should: yearQueries,
          minimum_should_match: 1,
        },
      });
    }

    // Filter by minimum rating
    if (minRating !== undefined) {
      filter.push({ range: { average_rating: { gte: minRating } } });
    }

    // Filter by age rating
    if (ageRating) {
      filter.push({ term: { age_rating: ageRating } });
    }

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
        from: (page - 1) * limit,
        size: limit,
        sort: searchTerm
          ? [{ _score: { order: 'desc' } }, { release_date: { order: 'desc' } }]
          : [{ release_date: { order: 'desc' } }],
      });

      const hits = response.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
      }));

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value || 0);

      return { hits, total };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(
    query: string,
    contentType?: 'movie' | 'series' | 'all',
    limit: number = 5,
  ): Promise<Array<{ id: string; title: string; type: string }>> {
    const filter: any[] = [];

    if (contentType && contentType !== 'all') {
      filter.push({ term: { content_type: contentType } });
    }

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        query: {
          bool: {
            must: [
              {
                match: {
                  'title.autocomplete': {
                    query,
                    fuzziness: 'AUTO',
                  },
                },
              },
            ],
            filter,
          },
        },
        size: limit,
        _source: ['content_id', 'title', 'content_type'],
      });

      return response.hits.hits.map((hit: any) => ({
        id: hit._source.content_id,
        title: hit._source.title,
        type: hit._source.content_type,
      }));
    } catch (error) {
      this.logger.error(`Suggestions failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Prepare content entity for Elasticsearch indexing
   * Converts database entity to Elasticsearch document format
   */
  private prepareDocument(content: ContentItem | Movie | Series): any {
    // Determine content type from instance
    let contentType = 'movie';
    if ('status' in content) {
      contentType = 'series';
    }

    const baseDoc: any = {
      content_id: content.content_id,
      title: content.title,
      description: content.description,
      content_type: contentType,
      release_date: content.release_date,
      age_rating: content.age_rating,
      created_at: content.created_at,
      updated_at: content.updated_at,
      slug: content.slug,
    };

    // Add genres if present
    if (content.genres && Array.isArray(content.genres)) {
      baseDoc.genres = content.genres.map((cg: any) => ({
        genre_id: cg.genre?.genre_id || cg.genre_id,
        name: cg.genre?.name || '',
      }));
    }

    // Add assets if present
    if (content.assets && Array.isArray(content.assets)) {
      const poster = content.assets.find((a: any) => a.asset_type === 'poster');
      const backdrop = content.assets.find((a: any) => a.asset_type === 'backdrop');
      if (poster) baseDoc.poster_url = poster.asset_url;
      if (backdrop) baseDoc.backdrop_url = backdrop.asset_url;
    }

    // Calculate average rating if ratings exist
    if (content.ratings && Array.isArray(content.ratings) && content.ratings.length > 0) {
      const sum = content.ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
      baseDoc.average_rating = sum / content.ratings.length;
    }

    // Add movie-specific fields
    if (contentType === 'movie' && 'duration_minutes' in content) {
      baseDoc.duration_minutes = (content as Movie).duration_minutes;
    }

    // Add series-specific fields
    if (contentType === 'series' && 'status' in content) {
      baseDoc.series_status = (content as Series).status;
    }

    return baseDoc;
  }

  /**
   * Delete and recreate the index (useful for schema changes)
   */
  async reindexAll(): Promise<void> {
    try {
      const exists = await this.elasticsearchService.indices.exists({
        index: this.indexName,
      });

      if (exists) {
        await this.elasticsearchService.indices.delete({
          index: this.indexName,
        });
        this.logger.log(`Deleted existing index: ${this.indexName}`);
      }

      await this.createIndex();
      this.logger.log('Index recreation complete. Run bulk indexing to populate.');
    } catch (error) {
      this.logger.error(`Failed to reindex: ${error.message}`, error.stack);
      throw error;
    }
  }
}
