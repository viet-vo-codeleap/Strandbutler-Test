import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContentGenre } from '../entities/content-genre.entity';

@Injectable()
export class ContentGenreRepository {
  constructor(
    @InjectRepository(ContentGenre)
    private readonly contentGenreRepo: Repository<ContentGenre>,
  ) {}

  async create(contentId: string, genreId: number): Promise<ContentGenre> {
    const contentGenre = this.contentGenreRepo.create({
      content_id: contentId,
      genre_id: genreId,
    });
    return await this.contentGenreRepo.save(contentGenre);
  }

  async findByContentId(contentId: string): Promise<ContentGenre[]> {
    return await this.contentGenreRepo.find({
      where: { content_id: contentId },
      relations: ['genre'],
    });
  }

  async findByGenreId(genreId: number, page: number = 1, limit: number = 20): Promise<[ContentGenre[], number]> {
    const skip = (page - 1) * limit;
    return await this.contentGenreRepo.findAndCount({
      where: { genre_id: genreId },
      relations: ['content'],
      skip,
      take: limit,
    });
  }

  async deleteByContentId(contentId: string): Promise<void> {
    await this.contentGenreRepo.delete({ content_id: contentId });
  }

  async deleteByContentAndGenre(contentId: string, genreId: number): Promise<boolean> {
    const result = await this.contentGenreRepo.delete({
      content_id: contentId,
      genre_id: genreId,
    });
    return (result.affected ?? 0) > 0;
  }

  async exists(contentId: string, genreId: number): Promise<boolean> {
    const count = await this.contentGenreRepo.count({
      where: {
        content_id: contentId,
        genre_id: genreId,
      },
    });
    return count > 0;
  }
}
