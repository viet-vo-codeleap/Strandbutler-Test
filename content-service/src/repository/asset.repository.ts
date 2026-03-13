import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../entities/asset.entity';
import { CreateAssetDto, UpdateAssetDto } from '../dto/asset.dto';

@Injectable()
export class AssetRepository {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  /**
   * Create a new asset
   */
  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    const asset = this.assetRepo.create({
      ...createAssetDto,
      language: createAssetDto.language || 'en-US',
    });
    return await this.assetRepo.save(asset);
  }

  /**
   * Find asset by ID
   */
  async findById(id: string): Promise<Asset | null> {
    return await this.assetRepo.findOne({
      where: { asset_id: id },
    });
  }

  /**
   * Find all assets for a specific content item
   */
  async findByContentId(contentId: string): Promise<Asset[]> {
    return await this.assetRepo.find({
      where: { content_id: contentId },
      order: { asset_type: 'ASC' },
    });
  }

  /**
   * Find asset by content ID and type
   */
  async findByContentIdAndType(
    contentId: string,
    assetType: string,
  ): Promise<Asset | null> {
    return await this.assetRepo.findOne({
      where: {
        content_id: contentId,
        asset_type: assetType,
      },
    });
  }

  /**
   * Update an asset
   */
  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<Asset> {
    await this.assetRepo.update(id, updateAssetDto);
    const asset = await this.findById(id);
    if (!asset) {
      throw new Error(`Asset with id ${id} not found after update`);
    }
    return asset;
  }

  /**
   * Delete an asset
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.assetRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Check if asset exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.assetRepo.count({
      where: { asset_id: id },
    });
    return count > 0;
  }
}
