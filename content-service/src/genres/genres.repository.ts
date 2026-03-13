import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genre } from '../entities/genre.entity';

@Injectable()
export class GenreRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepo: Repository<Genre>,
  ) {}

  async create(genreData: Partial<Genre>): Promise<Genre> {
    const genre = this.genreRepo.create(genreData);
    return await this.genreRepo.save(genre);
  }

  async findAll(): Promise<Genre[]> {
    return await this.genreRepo.find({
      select: ['genre_id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Genre | null> {
    return await this.genreRepo
      .createQueryBuilder('genre')
      .leftJoinAndSelect('genre.contents', 'content')
      .select(['genre.genre_id', 'genre.name', 'content.content_id'])
      .where('genre.genre_id = :id', { id })
      .getOne();
  }

  async findByName(name: string): Promise<Genre | null> {
    return await this.genreRepo.findOne({
      where: { name },
    });
  }

  async update(id: number, genreData: Partial<Genre>): Promise<Genre> {
    await this.genreRepo.update(id, genreData);
    const genre = await this.findById(id);
    if (!genre) {
      throw new Error(`Genre with id ${id} not found after update`);
    }
    return genre;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.genreRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.genreRepo.count({
      where: { genre_id: id },
    });
    return count > 0;
  }
}
