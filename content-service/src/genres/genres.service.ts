import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { GenreRepository } from './genres.repository';
import { CreateGenreDto, UpdateGenreDto } from './dto';
import { Genre } from '../entities/genre.entity';

/**
 * Service layer for Genre business logic
 * Handles genre CRUD operations
 */
@Injectable()
export class GenresService {
  private readonly logger = new Logger(GenresService.name);

  constructor(private readonly genreRepository: GenreRepository) {}

  /**
   * Create a new genre
   * @param createGenreDto - Genre data
   * @returns The created genre
   * @throws ConflictException if genre name already exists
   */
  async create(createGenreDto: CreateGenreDto): Promise<Genre> {

    // Check for duplicate genre name (case-insensitive)
    const existing = await this.genreRepository.findByName(createGenreDto.name.trim());
    if (existing) {
      throw new ConflictException(`Genre "${createGenreDto.name.trim()}" already exists`);
    }

    try {
      const genre = await this.genreRepository.create(createGenreDto);
      this.logger.log(`Genre created successfully with ID: ${genre.genre_id}`);
      return genre;
    } catch (error) {
      this.logger.error(`Failed to create genre: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all genres with content counts
   * @returns Array of genres with content counts
   */
  async findAll(): Promise<Genre[]> {
    this.logger.log('Fetching all genres');
    const genres = await this.genreRepository.findAll();
    this.logger.log(`Found ${genres.length} genres`);
    return genres;
  }

  /**
   * Find a single genre by ID
   * @param id - Genre ID
   * @returns Genre
   * @throws NotFoundException if genre doesn't exist
   */
  async findOne(id: number): Promise<Genre> {
    this.logger.log(`Fetching genre with ID: ${id}`);

    const genre = await this.genreRepository.findById(id);

    if (!genre) {
      this.logger.warn(`Genre not found with ID: ${id}`);
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }

    return genre;
  }

  /**
   * Update a genre
   * @param id - Genre ID
   * @param updateGenreDto - Partial genre data to update
   * @returns The updated genre
   * @throws NotFoundException if genre doesn't exist
   * @throws ConflictException if new name already exists
   */
  async update(id: number, updateGenreDto: UpdateGenreDto): Promise<Genre> {
    this.logger.log(`Updating genre with ID: ${id}`);

    // Verify genre exists
    await this.findOne(id);

    // Check for duplicate name if updating name
    if (updateGenreDto.name) {
      const existing = await this.genreRepository.findByName(updateGenreDto.name);
      if (existing && existing.genre_id !== id) {
        throw new ConflictException(`Genre "${updateGenreDto.name}" already exists`);
      }
    }

    try {
      const updatedGenre = await this.genreRepository.update(id, updateGenreDto);
      this.logger.log(`Genre updated successfully: ${id}`);
      return updatedGenre;
    } catch (error) {
      this.logger.error(`Failed to update genre ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a genre
   * Note: Will fail if genre has content assigned (foreign key constraint)
   * @param id - Genre ID
   * @returns true if deleted successfully
   * @throws NotFoundException if genre doesn't exist
   */
  async remove(id: number): Promise<boolean> {
    this.logger.log(`Deleting genre with ID: ${id}`);

    // Verify genre exists
    await this.findOne(id);

    try {
      const deleted = await this.genreRepository.delete(id);
      this.logger.log(`Genre deleted successfully: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete genre ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a genre exists
   * @param id - Genre ID
   * @returns true if exists, false otherwise
   */
  async exists(id: number): Promise<boolean> {
    return await this.genreRepository.exists(id);
  }
}
