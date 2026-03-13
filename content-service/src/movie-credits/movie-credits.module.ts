import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieCredit } from '../entities/movie-credit.entity';
import { MovieCreditsService } from './movie-credits.service';
import { MovieCreditsRepository } from './movie-credits.repository';
import { MovieCreditsController } from './movie-credits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MovieCredit])],
  controllers: [MovieCreditsController],
  providers: [MovieCreditsService, MovieCreditsRepository],
  exports: [MovieCreditsService],
})
export class MovieCreditsModule {}
