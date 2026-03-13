import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { MovieCredit } from './movie-credit.entity';
import { SeasonCredit } from './season-credit.entity';

@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  person_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  // Direct relationships to Movie and Season (not via ContentItem)
  @OneToMany(() => MovieCredit, (credit) => credit.person)
  movieCredits: MovieCredit[];

  @OneToMany(() => SeasonCredit, (credit) => credit.person)
  seasonCredits: SeasonCredit[];
}
