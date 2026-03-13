import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Health Service
 * Handles health check logic and database connectivity validation
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Get basic health status
   * Returns service information without database checks (fast)
   */
  getHealthStatus() {
    return {
      status: 'ok',
      service: 'content-service',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000, // Uptime in seconds
    };
  }

  /**
   * Get detailed health status with database connectivity check
   * Performs actual database query to verify connection
   * @returns Health status with database information
   */
  async getDetailedHealth() {
    const basicHealth = this.getHealthStatus();

    try {
      // Check database connectivity with a simple query
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        ...basicHealth,
        database: {
          status: 'connected',
          type: 'postgres',
          responseTime: responseTime, // Response time in milliseconds
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error.message);

      return {
        ...basicHealth,
        status: 'degraded',
        database: {
          status: 'disconnected',
          type: 'postgres',
          error: error.message,
        },
      };
    }
  }
}
