import { Entity, Column, ChildEntity, OneToMany } from 'typeorm';
import { ContentItem } from './content-item.entity';
import { Season } from './season.entity';

@ChildEntity('series')
export class Series extends ContentItem {
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'Ongoing', comment: 'e.g., Ongoing, Ended' })
  status: string;

  @OneToMany(() => Season, (season) => season.series)
  seasons: Season[];
}
