import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Series } from './series.entity';
import { Episode } from './episode.entity';
import { SeasonCredit } from './season-credit.entity';

@Entity('seasons')
@Index(['series_id', 'season_number'], { unique: true })
export class Season {
  @PrimaryGeneratedColumn('uuid')
  season_id: string;

  @Column({ type: 'uuid', nullable: false })
  series_id: string;

  @Column({ type: 'integer', nullable: false })
  season_number: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  release_date: Date;

  // Relationships
  @ManyToOne(() => Series, (series) => series.seasons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'series_id' })
  series: Series;

  @OneToMany(() => Episode, (episode) => episode.season)
  episodes: Episode[];

  @OneToMany(() => SeasonCredit, (credit) => credit.season)
  credits: SeasonCredit[];
}
