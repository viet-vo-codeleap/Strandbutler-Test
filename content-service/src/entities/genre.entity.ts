import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { ContentGenre } from './content-genre.entity';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn()
  genre_id: number;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  @OneToMany(() => ContentGenre, (contentGenre) => contentGenre.genre)
  contents: ContentGenre[];
}
