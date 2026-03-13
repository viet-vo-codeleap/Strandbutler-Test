import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';
import { Season } from './season.entity';
import { Person } from './person.entity';

/**
 * SeasonCredit Entity
 * Direct relationship between Season and Person for cast/crew
 */
@Entity('season_credits')
@Index(['season_id', 'person_id', 'role'], { unique: true })
export class SeasonCredit {
  @PrimaryColumn({ type: 'uuid' })
  season_id: string;

  @PrimaryColumn({ type: 'uuid' })
  person_id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  role: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  character_name: string;

  @Column({ type: 'integer', nullable: true, default: 0 })
  order: number;

  @ManyToOne(() => Season, (season) => season.credits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'season_id' })
  season: Season;

  @ManyToOne(() => Person, (person) => person.seasonCredits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: Person;
}
