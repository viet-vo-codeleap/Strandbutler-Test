import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresRepository } from '@common/src/database/postgres/postgres.repository';
import { Season } from '../entities/season.entity';

/**
 * Repository for managing Season entities
 * Extends PostgresRepository to inherit common CRUD operations
 */
@Injectable()
export class SeasonRepository extends PostgresRepository<Season> {
  protected readonly logger = new Logger(SeasonRepository.name);
  protected primaryKeyField = 'season_id';

  constructor(
    @InjectRepository(Season)
    seasonRepository: Repository<Season>,
  ) {
    super(seasonRepository);
  }

  /**
   * Find a season by its ID with all relations
   * @param id - The UUID of the season
   * @returns Season with episodes, credits, and series or null if not found
   */
  override async findById(id: string): Promise<Season | null> {
    return await this.repository.findOne({
      where: { season_id: id },
      relations: ['series', 'episodes', 'credits', 'credits.person'],
      order: {
        episodes: {
          episode_number: 'ASC',
        },
        credits: {
          order: 'ASC',
        },
      },
    });
  }

  /**
   * Find all seasons for a specific series
   * @param seriesId - Series content_id
   * @returns Array of seasons ordered by season number
   */
  async findBySeriesId(seriesId: string): Promise<Season[]> {
    return await this.repository.find({
      where: { series_id: seriesId },
      relations: ['episodes'],
      order: {
        season_number: 'ASC',
        episodes: {
          episode_number: 'ASC',
        },
      },
    });
  }

  /**
   * Check if season number already exists for a series
   * @param seriesId - Series content_id
   * @param seasonNumber - Season number to check
   * @returns true if exists, false otherwise
   */
  async seasonNumberExists(
    seriesId: string,
    seasonNumber: number,
  ): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('season')
      .where('season.series_id = :seriesId', { seriesId })
      .andWhere('season.season_number = :seasonNumber', { seasonNumber })
      .getCount();
    return count > 0;
  }
}
