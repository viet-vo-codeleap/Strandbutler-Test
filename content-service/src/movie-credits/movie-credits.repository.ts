import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieCredit } from '../entities/movie-credit.entity';

@Injectable()
export class MovieCreditsRepository {
  constructor(
    @InjectRepository(MovieCredit)
    private readonly movieCreditRepo: Repository<MovieCredit>,
  ) {}

  async create(creditData: Partial<MovieCredit>): Promise<MovieCredit> {
    const movieCredit = this.movieCreditRepo.create(creditData);
    return await this.movieCreditRepo.save(movieCredit);
  }

  async findByMovieId(movieId: string): Promise<MovieCredit[]> {
    return await this.movieCreditRepo.find({
      where: { movie_id: movieId },
      relations: ['person'],
      order: {
        order: 'ASC',
        person: { name: 'ASC' },
      },
    });
  }

  async findByPersonId(personId: string, page: number = 1, limit: number = 20): Promise<[MovieCredit[], number]> {
    const skip = (page - 1) * limit;
    return await this.movieCreditRepo.findAndCount({
      where: { person_id: personId },
      relations: ['movie'],
      skip,
      take: limit,
      order: {
        movie: { release_date: 'DESC' },
      },
    });
  }

  async findByMoviePersonRole(movieId: string, personId: string, role: string): Promise<MovieCredit | null> {
    return await this.movieCreditRepo.findOne({
      where: {
        movie_id: movieId,
        person_id: personId,
        role,
      },
    });
  }

  async delete(movieId: string, personId: string, role: string): Promise<boolean> {
    const result = await this.movieCreditRepo.delete({
      movie_id: movieId,
      person_id: personId,
      role,
    });
    return (result.affected ?? 0) > 0;
  }

  async deleteByMovieId(movieId: string): Promise<void> {
    await this.movieCreditRepo.delete({ movie_id: movieId });
  }
}
