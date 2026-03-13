import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';
import { SeasonRepository } from '../repository/season.repository';
import { Season } from '../entities/season.entity';
import { SeasonCreditsModule } from '../season-credits/season-credits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Season]),
    SeasonCreditsModule, // Import for cast/crew management
  ],
  controllers: [SeasonsController],
  providers: [SeasonsService, SeasonRepository],
  exports: [SeasonsService],
})
export class SeasonsModule {}
