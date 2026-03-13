import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  TableInheritance,
} from 'typeorm';
import { ContentGenre } from './content-genre.entity';
import { Asset } from './asset.entity';
import { Rating } from './rating.entity';

/**
 * ContentItem - Base entity for Movies and Series
 *
 * Provides:
 * - Genres (via content_genres junction table)
 * - Assets (posters, trailers)
 * - Ratings
 * - Common metadata (title, description, age_rating, etc.)
 *
 * Note: Credits (cast/crew) are NOT here!
 * - Movie has direct movie_credits relationship
 * - Season has direct season_credits relationship
 */
@Entity('content_items')
@TableInheritance({ column: { type: 'varchar', name: 'content_type' } })
export class ContentItem {
  @PrimaryGeneratedColumn('uuid')
  content_id: string;

  // Virtual property that returns the content type based on the class name
  // This avoids conflict with the TableInheritance discriminator column
  get type(): string {
    const className = this.constructor.name.toLowerCase();
    return className === 'movie' ? 'movie' :
      className === 'series' ? 'series' : 'content';
  }

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 300, nullable: true, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  release_date: Date;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: 'e.g., PG-13, R, PG' })
  age_rating: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relationships (NO credits here - handled by Movie/Season directly)
  @OneToMany(() => ContentGenre, (contentGenre) => contentGenre.content)
  genres: ContentGenre[];

  @OneToMany(() => Asset, (asset) => asset.content)
  assets: Asset[];

  @OneToMany(() => Rating, (rating) => rating.content)
  ratings: Rating[];
}
