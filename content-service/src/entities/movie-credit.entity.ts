import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';
import { Movie } from './movie.entity';
import { Person } from './person.entity';

/**
 * MovieCredit Entity
 * Direct relationship between Movie and Person for cast/crew
 */
@Entity('movie_credits')
@Index(['movie_id', 'person_id', 'role'], { unique: true })
export class MovieCredit {
  @PrimaryColumn({ type: 'uuid' })
  movie_id: string;

  @PrimaryColumn({ type: 'uuid' })
  person_id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  role: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  character_name: string;

  @Column({ type: 'integer', nullable: true, default: 0 })
  order: number;

  @ManyToOne(() => Movie, (movie) => movie.credits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Person, (person) => person.movieCredits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: Person;
}
