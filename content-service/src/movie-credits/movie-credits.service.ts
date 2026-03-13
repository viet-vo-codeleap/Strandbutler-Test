import { Injectable, Logger } from '@nestjs/common';
import { MovieCreditsRepository } from './movie-credits.repository';
import { AddMovieCreditsDto } from './dto/add-movie-credits.dto';
import { MovieCredit } from '../entities/movie-credit.entity';

@Injectable()
export class MovieCreditsService {
  private readonly logger = new Logger(MovieCreditsService.name);

  constructor(private readonly movieCreditsRepository: MovieCreditsRepository) {}

  async addCredits(movieId: string, addCreditsDto: AddMovieCreditsDto): Promise<MovieCredit[]> {
    this.logger.log(`Adding ${addCreditsDto.credits.length} credits to movie ${movieId}`);

    const addedCredits: MovieCredit[] = [];

    for (const creditDto of addCreditsDto.credits) {
      // Check for duplicate credit
      const existing = await this.movieCreditsRepository.findByMoviePersonRole(
        movieId,
        creditDto.person_id,
        creditDto.role,
      );

      if (existing) {
        this.logger.log(`Skipping duplicate credit: person ${creditDto.person_id}, role ${creditDto.role}`);
        continue;
      }

      const credit = await this.movieCreditsRepository.create({
        movie_id: movieId,
        person_id: creditDto.person_id,
        role: creditDto.role,
        character_name: creditDto.character_name || undefined,
        order: creditDto.order || 0,
      });

      addedCredits.push(credit);
    }

    this.logger.log(`Successfully added ${addedCredits.length} credits to movie ${movieId}`);
    return addedCredits;
  }

  async getCreditsByMovie(movieId: string): Promise<MovieCredit[]> {
    return await this.movieCreditsRepository.findByMovieId(movieId);
  }

  async getCreditsByPerson(personId: string, page: number, limit: number): Promise<[MovieCredit[], number]> {
    return await this.movieCreditsRepository.findByPersonId(personId, page, limit);
  }

  async removeCredit(movieId: string, personId: string, role: string): Promise<void> {
    await this.movieCreditsRepository.delete(movieId, personId, role);
    this.logger.log(`Removed credit for person ${personId} from movie ${movieId}`);
  }
}
