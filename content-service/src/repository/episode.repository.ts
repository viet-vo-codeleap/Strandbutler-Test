import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresRepository } from '@common/src/database/postgres/postgres.repository';
import { Episode } from '../entities/episode.entity';

/**
 * Repository for managing Episode entities
 * Extends PostgresRepository to inherit common CRUD operations
 */
@Injectable()
export class EpisodeRepository extends PostgresRepository<Episode> {
  protected readonly logger = new Logger(EpisodeRepository.name);
  protected primaryKeyField = 'episode_id';

  constructor(
    @InjectRepository(Episode)
    episodeRepository: Repository<Episode>,
  ) {
    super(episodeRepository);
  }

  /**
   * Find an episode by its ID with season relation
   * @param id - The UUID of the episode
   * @returns Episode with season relation or null if not found
   */
  override async findById(id: string): Promise<Episode | null> {
    return await this.repository.findOne({
      where: { episode_id: id },
      relations: ['season', 'season.series', 'season.series.assets'],
    });
  }

  /**
   * Find all episodes for a specific season
   * @param seasonId - Season UUID
   * @returns Array of episodes ordered by episode number
   */
  async findBySeasonId(seasonId: string): Promise<Episode[]> {
    return await this.repository.find({
      where: { season_id: seasonId },
      order: { episode_number: 'ASC' },
    });
  }

  /**
   * Check if episode number already exists for a season
   * @param seasonId - Season UUID
   * @param episodeNumber - Episode number to check
   * @returns true if exists, false otherwise
   */
  async episodeNumberExists(seasonId: string, episodeNumber: number): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        season_id: seasonId,
        episode_number: episodeNumber,
      },
    });
    return count > 0;
  }
}
