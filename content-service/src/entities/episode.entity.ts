import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Season } from './season.entity';

@Entity('episodes')
@Index(['season_id', 'episode_number'], { unique: true })
export class Episode {
  @PrimaryGeneratedColumn('uuid')
  episode_id: string;

  @Column({ type: 'uuid', nullable: false })
  season_id: string;

  @Column({ type: 'integer', nullable: false })
  episode_number: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer', nullable: true })
  duration_minutes: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Identifier for streaming service' })
  stream_asset_id: string;

  // Relationships
  @ManyToOne(() => Season, (season) => season.episodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'season_id' })
  season: Season;
}
