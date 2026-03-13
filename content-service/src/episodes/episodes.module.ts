import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { EpisodesController } from './episodes.controller';
import { EpisodesService } from './episodes.service';
import { EpisodeRepository } from '../repository/episode.repository';
import { Episode } from '../entities/episode.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Episode]),
    BullModule.registerQueue({
      name: 'new-episode',
    }),
    ConfigModule,
  ],
  controllers: [EpisodesController],
  providers: [EpisodesService, EpisodeRepository],
  exports: [EpisodesService],
})
export class EpisodesModule {}
