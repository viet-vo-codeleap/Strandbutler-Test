/**
 * Central export file for all DTOs
 * Simplifies imports throughout the application
 *
 * Usage:
 * import { CreateMovieDto, UpdateMovieDto } from './dto';
 * instead of:
 * import { CreateMovieDto } from './dto/create-movie.dto';
 * import { UpdateMovieDto } from './dto/update-movie.dto';
 */

export * from './create-movie.dto';
export * from './update-movie.dto';
export * from './create-series.dto';
export * from './update-series.dto';
export * from './create-season.dto';
export * from './update-season.dto';
export * from './create-episode.dto';
export * from './update-episode.dto';
export * from './create-rating.dto';
export * from './search.dto';
export * from './asset.dto';
