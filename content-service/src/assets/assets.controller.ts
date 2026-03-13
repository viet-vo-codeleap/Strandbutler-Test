import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto } from '../dto/asset.dto';
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserRole as Role,
  Public,
} from '@libs/common';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  /**
   * Create a new asset (poster, backdrop, trailer)
   * POST /api/assets
   */
  @ApiOperation({
    summary: 'Add asset to content',
    description:
      'Add a new asset (poster, backdrop, trailer) to a movie or series. If an asset of the same type already exists, it will be updated.',
  })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiBearerAuth('JWT-auth')
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAssetDto: CreateAssetDto) {
    return await this.assetsService.create(createAssetDto);
  }

  /**
   * Get all assets for a specific content item
   * GET /api/assets/content/:contentId
   */
  @ApiOperation({
    summary: 'Get assets for content',
    description: 'Get all assets (posters, backdrops, trailers) for a specific movie or series.',
  })
  @ApiParam({
    name: 'contentId',
    description: 'Content UUID (movie or series)',
  })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @Public()
  @Get('content/:contentId')
  async findByContentId(
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return await this.assetsService.findByContentId(contentId);
  }

  /**
   * Get single asset by ID
   * GET /api/assets/:id
   */
  @ApiOperation({
    summary: 'Get asset by ID',
    description: 'Get a single asset by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.assetsService.findOne(id);
  }

  /**
   * Update an asset
   * PUT /api/assets/:id
   */
  @ApiOperation({
    summary: 'Update asset',
    description: 'Update an existing asset (change URL, type, or language).',
  })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiBearerAuth('JWT-auth')
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ) {
    return await this.assetsService.update(id, updateAssetDto);
  }

  /**
   * Delete an asset
   * DELETE /api/assets/:id
   */
  @ApiOperation({
    summary: 'Delete asset',
    description: 'Delete an asset from a movie or series.',
  })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  @ApiResponse({ status: 204, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.assetsService.remove(id);
  }

  /**
   * Convenience endpoint to update/create poster
   * PUT /api/assets/content/:contentId/poster
   */
  @ApiOperation({
    summary: 'Add or update poster',
    description: 'Convenience endpoint to add or update the poster for a movie or series.',
  })
  @ApiParam({
    name: 'contentId',
    description: 'Content UUID (movie or series)',
  })
  @ApiResponse({ status: 200, description: 'Poster updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiBearerAuth('JWT-auth')
  @Put('content/:contentId/poster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async upsertPoster(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() body: { poster_url: string; language?: string },
  ) {
    return await this.assetsService.upsertPoster(
      contentId,
      body.poster_url,
      body.language,
    );
  }
}
