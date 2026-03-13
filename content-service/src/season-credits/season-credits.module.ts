import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonCredit } from '../entities/season-credit.entity';
import { SeasonCreditsService } from './season-credits.service';
import { SeasonCreditsRepository } from './season-credits.repository';
import { SeasonCreditsController } from './season-credits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SeasonCredit])],
  controllers: [SeasonCreditsController],
  providers: [SeasonCreditsService, SeasonCreditsRepository],
  exports: [SeasonCreditsService],
})
export class SeasonCreditsModule {}
