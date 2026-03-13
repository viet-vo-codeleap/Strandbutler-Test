import { ConfigService } from '@nestjs/config';
import { ElasticsearchModuleOptions } from '@nestjs/elasticsearch';

/**
 * Elasticsearch Configuration Factory
 * Creates Elasticsearch client configuration from environment variables
 */
export const elasticsearchConfig = (
  configService: ConfigService,
): ElasticsearchModuleOptions => ({
  node: configService.get<string>('ELASTICSEARCH_NODE', 'http://elasticsearch:9200'),
  maxRetries: 10,
  requestTimeout: 60000,
  sniffOnStart: false,
});
