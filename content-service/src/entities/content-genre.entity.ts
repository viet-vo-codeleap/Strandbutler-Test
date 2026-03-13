import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { ContentItem } from './content-item.entity';
import { Genre } from './genre.entity';

@Entity('content_genres')
export class ContentGenre {
  @PrimaryColumn({ type: 'uuid' })
  content_id: string;

  @PrimaryColumn({ type: 'integer' })
  genre_id: number;

  // Relationships
  @ManyToOne(() => ContentItem, (content) => content.genres, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: ContentItem;

  @ManyToOne(() => Genre, (genre) => genre.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genre_id' })
  genre: Genre;
}
