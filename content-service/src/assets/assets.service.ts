import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AssetRepository } from '../repository/asset.repository';
import { CreateAssetDto, UpdateAssetDto } from '../dto/asset.dto';
import { Asset } from '../entities/asset.entity';

/**
 * Service for managing content assets (posters, backdrops, trailers)
 */
@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private readonly assetRepository: AssetRepository) {}

  /**
   * Create a new asset
   * If an asset of the same type already exists for this content, it will be replaced
   */
  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    this.logger.log(
      `Creating ${createAssetDto.asset_type} asset for content: ${createAssetDto.content_id}`,
    );

    // Check if asset of this type already exists for this content
    const existing = await this.assetRepository.findByContentIdAndType(
      createAssetDto.content_id,
      createAssetDto.asset_type,
    );

    if (existing) {
      this.logger.log(
        `Asset of type ${createAssetDto.asset_type} already exists, updating instead`,
      );
      // Update existing asset instead of creating duplicate
      return await this.update(existing.asset_id, {
        asset_url: createAssetDto.asset_url,
        language: createAssetDto.language,
      });
    }

    try {
      const asset = await this.assetRepository.create(createAssetDto);
      this.logger.log(`Asset created successfully with ID: ${asset.asset_id}`);
      return asset;
    } catch (error) {
      this.logger.error(`Failed to create asset: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all assets for a specific content item
   */
  async findByContentId(contentId: string): Promise<Asset[]> {
    this.logger.log(`Fetching assets for content: ${contentId}`);
    const assets = await this.assetRepository.findByContentId(contentId);
    this.logger.log(`Found ${assets.length} assets`);
    return assets;
  }

  /**
   * Get a single asset by ID
   */
  async findOne(id: string): Promise<Asset> {
    this.logger.log(`Fetching asset with ID: ${id}`);

    const asset = await this.assetRepository.findById(id);

    if (!asset) {
      this.logger.warn(`Asset not found with ID: ${id}`);
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return asset;
  }

  /**
   * Update an asset
   */
  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<Asset> {
    this.logger.log(`Updating asset with ID: ${id}`);

    // Verify asset exists
    await this.findOne(id);

    try {
      const updated = await this.assetRepository.update(id, updateAssetDto);
      this.logger.log(`Asset updated successfully: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update asset ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete an asset
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting asset with ID: ${id}`);

    // Verify asset exists
    await this.findOne(id);

    const deleted = await this.assetRepository.delete(id);

    if (!deleted) {
      throw new Error(`Failed to delete asset ${id}`);
    }

    this.logger.log(`Asset deleted successfully: ${id}`);
  }

  /**
   * Update or create poster for content (convenience method)
   */
  async upsertPoster(
    contentId: string,
    posterUrl: string,
    language: string = 'en-US',
  ): Promise<Asset> {
    this.logger.log(`Upserting poster for content: ${contentId}`);

    const existing = await this.assetRepository.findByContentIdAndType(
      contentId,
      'poster',
    );

    if (existing) {
      return await this.update(existing.asset_id, { asset_url: posterUrl });
    }

    return await this.create({
      content_id: contentId,
      asset_type: 'poster',
      asset_url: posterUrl,
      language,
    });
  }
}
