import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@libs/common';
import { HealthService } from './health.service';

/**
 * Health Check Controller
 * Provides endpoints for monitoring service health and readiness
 * Used by Kubernetes, load balancers, and monitoring systems
 *
 * Note: Health check endpoints are public (no authentication required)
 * This allows monitoring systems to check service health without tokens
 */
@ApiTags('Health')
@Controller('health')
@Public() // Make all health endpoints public (no JWT required)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * Returns service status and basic information
   * GET /health
   */
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'content-service' },
        timestamp: { type: 'string', example: '2024-10-27T10:30:00.000Z' },
        uptime: { type: 'number', example: 123.456 },
      },
    },
  })
  healthCheck() {
    return this.healthService.getHealthStatus();
  }

  /**
   * Detailed health check with database connectivity
   * Returns service status with database connection check
   * GET /health/detailed
   */
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with database status' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy with database connected',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'content-service' },
        timestamp: { type: 'string', example: '2024-10-27T10:30:00.000Z' },
        uptime: { type: 'number', example: 123.456 },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'connected' },
            type: { type: 'string', example: 'postgres' },
            responseTime: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy (database issue)' })
  async detailedHealthCheck() {
    return await this.healthService.getDetailedHealth();
  }
}
