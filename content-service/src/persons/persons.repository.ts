import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Person } from '../entities/person.entity';

@Injectable()
export class PersonRepository {
  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
  ) {}

  async create(personData: Partial<Person>): Promise<Person> {
    const person = this.personRepo.create(personData);
    return await this.personRepo.save(person);
  }

  async findAll(page: number = 1, limit: number = 20): Promise<[Person[], number]> {
    const skip = (page - 1) * limit;
    return await this.personRepo.findAndCount({
      skip,
      take: limit,
      order: { name: 'ASC' },
    });
  }

  async search(query: string, limit: number = 10): Promise<Person[]> {
    return await this.personRepo.find({
      where: { name: ILike(`%${query}%`) },
      take: limit,
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Person | null> {
    return await this.personRepo.findOne({
      where: { person_id: id },
      relations: ['movieCredits', 'seasonCredits'],
    });
  }

  async findByName(name: string): Promise<Person | null> {
    return await this.personRepo.findOne({
      where: { name: ILike(name) },
    });
  }

  async update(id: string, personData: Partial<Person>): Promise<Person> {
    await this.personRepo.update(id, personData);
    const person = await this.findById(id);
    if (!person) {
      throw new Error(`Person with id ${id} not found after update`);
    }
    return person;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.personRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.personRepo.count({
      where: { person_id: id },
    });
    return count > 0;
  }
}
