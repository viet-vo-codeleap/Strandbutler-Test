import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { SeasonRepository } from '../repository/season.repository';
import { CreateSeasonDto, UpdateSeasonDto } from '../dto';
import { Season } from '../entities/season.entity';

/**
 * Service layer for Season business logic
 * Handles season operations between controllers and repositories
 */
@Injectable()
export class SeasonsService {
  private readonly logger = new Logger(SeasonsService.name);

  constructor(private readonly seasonRepository: SeasonRepository) {}

  /**
   * Create a new season
   */
  async create(createSeasonDto: CreateSeasonDto): Promise<Season> {
    this.logger.log(`Creating season ${createSeasonDto.season_number} for series ${createSeasonDto.series_id}`);

    // Check if season number already exists for this series
    const exists = await this.seasonRepository.seasonNumberExists(
      createSeasonDto.series_id,
      createSeasonDto.season_number,
    );

    if (exists) {
      throw new ConflictException(
        `Season ${createSeasonDto.season_number} already exists for series ${createSeasonDto.series_id}`,
      );
    }

    try {
      // Transform date string to Date object if provided
      const seasonData = {
        ...createSeasonDto,
        release_date: createSeasonDto.release_date ? new Date(createSeasonDto.release_date) : undefined,
      };

      const season = await this.seasonRepository.create(seasonData);
      this.logger.log(`Season created successfully with ID: ${season.season_id}`);
      return season;
    } catch (error) {
      this.logger.error(`Failed to create season: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all seasons for a specific series
   */
  async findBySeriesId(seriesId: string): Promise<Season[]> {
    this.logger.log(`Fetching seasons for series: ${seriesId}`);
    return await this.seasonRepository.findBySeriesId(seriesId);
  }

  /**
   * Find a single season by ID
   */
  async findOne(id: string): Promise<Season> {
    this.logger.log(`Fetching season with ID: ${id}`);

    const season = await this.seasonRepository.findById(id);

    if (!season) {
      this.logger.warn(`Season not found with ID: ${id}`);
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    return season;
  }

  /**
   * Update a season
   */
  async update(id: string, updateSeasonDto: UpdateSeasonDto): Promise<Season> {
    this.logger.log(`Updating season with ID: ${id}`);

    const exists = await this.seasonRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    try {
      // Transform date string to Date object if provided
      const seasonData = {
        ...updateSeasonDto,
        release_date: updateSeasonDto.release_date ? new Date(updateSeasonDto.release_date) : undefined,
      };

      const updated = await this.seasonRepository.update(id, seasonData);
      this.logger.log(`Season updated successfully: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update season: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a season
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting season with ID: ${id}`);

    const exists = await this.seasonRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    await this.seasonRepository.delete(id);
    this.logger.log(`Season deleted successfully: ${id}`);
  }
}
