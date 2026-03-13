import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { ContentItem } from './content-item.entity';

@Entity('ratings')
@Index(['content_id', 'user_id'], { unique: true })
@Index(['content_id'])
@Index(['user_id'])
@Check(`"rating_value" >= 1 AND "rating_value" <= 5`)
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  rating_id: string;

  @Column({ type: 'uuid', nullable: false })
  content_id: string;

  @Column({ type: 'uuid', nullable: false, comment: 'External user UUID from Users Service' })
  user_id: string;

  @Column({ type: 'integer', nullable: false })
  rating_value: number; // 1-5 stars

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relationships - FK to ContentItem
  @ManyToOne(() => ContentItem, (content) => content.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: ContentItem;
}
