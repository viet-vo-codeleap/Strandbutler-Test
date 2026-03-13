import { Entity, Column, ChildEntity, OneToMany } from 'typeorm';
import { ContentItem } from './content-item.entity';
import { MovieCredit } from './movie-credit.entity';

@ChildEntity('movie')
export class Movie extends ContentItem {
  @Column({ type: 'integer', nullable: true })
  duration_minutes: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Identifier for streaming service' })
  stream_asset_id: string;

  // Direct relationship to cast/crew (not via ContentItem.credits)
  @OneToMany(() => MovieCredit, (credit) => credit.movie)
  credits: MovieCredit[];
}
