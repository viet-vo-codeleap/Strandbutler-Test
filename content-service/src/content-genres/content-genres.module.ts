import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentGenresService } from './content-genres.service';
import { ContentGenresController, GenreContentController } from './content-genres.controller';
import { ContentGenreRepository } from './content-genres.repository';
import { ContentGenre } from '../entities/content-genre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentGenre])],
  controllers: [ContentGenresController, GenreContentController],
  providers: [ContentGenresService, ContentGenreRepository],
  exports: [ContentGenresService],
})
export class ContentGenresModule {}
