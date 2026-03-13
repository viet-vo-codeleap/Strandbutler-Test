import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EpisodeRepository } from '../repository/episode.repository';
import { CreateEpisodeDto, UpdateEpisodeDto } from '../dto';
import { Episode } from '../entities/episode.entity';

/**
 * Service layer for Episode business logic
 * Handles episode operations and publishes events to message queue
 */
@Injectable()
export class EpisodesService {
  private readonly logger = new Logger(EpisodesService.name);

  constructor(
    private readonly episodeRepository: EpisodeRepository,
    @InjectQueue('new-episode') private readonly newEpisodeQueue: Queue,
  ) {}

  /**
   * Create a new episode
   * After creation, publishes event to queue for notification-service to consume
   */
  async create(createEpisodeDto: CreateEpisodeDto): Promise<Episode> {
    this.logger.log(`Creating new episode: ${createEpisodeDto.title} for season ${createEpisodeDto.season_id}`);

    // Check if episode number already exists for this season
    const exists = await this.episodeRepository.episodeNumberExists(
      createEpisodeDto.season_id,
      createEpisodeDto.episode_number,
    );

    if (exists) {
      throw new ConflictException(
        `Episode number ${createEpisodeDto.episode_number} already exists for season ${createEpisodeDto.season_id}`,
      );
    }

    try {
      // Create the episode
      const episode = await this.episodeRepository.create(createEpisodeDto);
      this.logger.log(`Episode created successfully with ID: ${episode.episode_id}`);

      // Load episode with relations to get series info
      const episodeWithRelations = await this.episodeRepository.findById(episode.episode_id);

      // Publish new episode event to queue
      if (episodeWithRelations?.season?.series) {
        await this.publishNewEpisodeEvent(episodeWithRelations);
      } else {
        this.logger.warn(`Could not publish event: series info not found for episode ${episode.episode_id}`);
      }

      return episode;
    } catch (error) {
      this.logger.error(`Failed to create episode: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Publish new episode event to message queue
   * Notification-service will consume this event and handle notifications
   */
  private async publishNewEpisodeEvent(episode: Episode): Promise<void> {
    try {
      const series = episode.season.series;

      // Find poster asset from series assets
      const posterAsset = series.assets?.find(asset => asset.asset_type === 'poster');

      const event = {
        contentId: series.content_id,
        title: series.title,
        episodeTitle: episode.title,
        episodeId: episode.episode_id,
        seasonNumber: episode.season.season_number,
        episodeNumber: episode.episode_number,
        image: posterAsset?.asset_url, // Add series poster image
        slug: series.slug, // Add series slug
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(`Event payload: ${JSON.stringify(event)}`);
      this.logger.log(`Publishing new episode event for series: ${series.title}`);

      await this.newEpisodeQueue.add('episode-created', event, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(`New episode event published successfully`);
    } catch (error) {
      // Don't fail episode creation if queue publish fails
      this.logger.error(`Failed to publish new episode event: ${error.message}`, error.stack);
    }
  }

  /**
   * Find all episodes for a specific season
   */
  async findBySeasonId(seasonId: string): Promise<Episode[]> {
    this.logger.log(`Fetching episodes for season: ${seasonId}`);
    return await this.episodeRepository.findBySeasonId(seasonId);
  }

  /**
   * Find a single episode by ID
   */
  async findOne(id: string): Promise<Episode> {
    this.logger.log(`Fetching episode with ID: ${id}`);

    const episode = await this.episodeRepository.findById(id);

    if (!episode) {
      this.logger.warn(`Episode not found with ID: ${id}`);
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    return episode;
  }

  /**
   * Update an episode
   */
  async update(id: string, updateEpisodeDto: UpdateEpisodeDto): Promise<Episode> {
    this.logger.log(`Updating episode with ID: ${id}`);

    const exists = await this.episodeRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    try {
      const updated = await this.episodeRepository.update(id, updateEpisodeDto);
      this.logger.log(`Episode updated successfully: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update episode: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete an episode
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting episode with ID: ${id}`);

    const exists = await this.episodeRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    await this.episodeRepository.delete(id);
    this.logger.log(`Episode deleted successfully: ${id}`);
  }
}
