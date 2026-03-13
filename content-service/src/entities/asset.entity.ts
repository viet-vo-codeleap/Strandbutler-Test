import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContentItem } from './content-item.entity';

@Entity('assets')
@Index(['content_id', 'asset_type'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  asset_id: string;

  @Column({ type: 'uuid', nullable: false })
  content_id: string;

  @Column({ type: 'varchar', length: 50, nullable: false, comment: 'e.g., poster, backdrop, trailer' })
  asset_type: string;

  @Column({ type: 'varchar', length: 512, nullable: false })
  asset_url: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'en-US', comment: 'For localized assets' })
  language: string;

  // Relationships - FK to ContentItem
  @ManyToOne(() => ContentItem, (content) => content.assets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: ContentItem;
}
