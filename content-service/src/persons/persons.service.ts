import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PersonRepository } from './persons.repository';
import { CreatePersonDto, UpdatePersonDto } from './dto';
import { Person } from '../entities/person.entity';

/**
 * Service layer for Person (Cast/Crew) business logic
 * Handles actors, directors, writers, producers, etc.
 */
@Injectable()
export class PersonsService {
  private readonly logger = new Logger(PersonsService.name);

  constructor(private readonly personRepository: PersonRepository) {}

  /**
   * Create a new person
   * @param createPersonDto - Person data
   * @returns The created person
   * @throws ConflictException if person name already exists
   */
  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    this.logger.log(`Creating new person: ${createPersonDto.name}`);

    // Check for duplicate person name (case-insensitive)
    const existing = await this.personRepository.findByName(createPersonDto.name);
    if (existing) {
      throw new ConflictException(
        `Person "${createPersonDto.name}" already exists with ID: ${existing.person_id}. Use existing person ID.`
      );
    }

    try {
      // Transform date string to Date object
      const personData: Partial<Person> = {
        ...createPersonDto,
        date_of_birth: createPersonDto.date_of_birth
          ? new Date(createPersonDto.date_of_birth)
          : undefined,
      };

      const person = await this.personRepository.create(personData);
      this.logger.log(`Person created successfully with ID: ${person.person_id}`);
      return person;
    } catch (error) {
      this.logger.error(`Failed to create person: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all persons with pagination
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20, max: 100)
   * @returns Tuple of [persons array, total count]
   */
  async findAll(page: number = 1, limit: number = 20): Promise<[Person[], number]> {
    // Enforce maximum limit
    const safeLimit = Math.min(limit, 100);
    this.logger.log(`Fetching persons - page: ${page}, limit: ${safeLimit}`);

    const [persons, total] = await this.personRepository.findAll(page, safeLimit);
    this.logger.log(`Found ${total} persons, returning page ${page}`);

    return [persons, total];
  }

  /**
   * Search persons by name
   * @param query - Search query
   * @param limit - Max results (default: 10)
   * @returns Array of matching persons
   */
  async search(query: string, limit: number = 10): Promise<Person[]> {
    this.logger.log(`Searching persons: ${query}`);
    return await this.personRepository.search(query, limit);
  }

  /**
   * Find a single person by ID
   * @param id - Person UUID
   * @returns Person with credits
   * @throws NotFoundException if person doesn't exist
   */
  async findOne(id: string): Promise<Person> {
    this.logger.log(`Fetching person with ID: ${id}`);

    const person = await this.personRepository.findById(id);

    if (!person) {
      this.logger.warn(`Person not found with ID: ${id}`);
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  /**
   * Update a person
   * @param id - Person UUID
   * @param updatePersonDto - Partial person data to update
   * @returns The updated person
   * @throws NotFoundException if person doesn't exist
   */
  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    this.logger.log(`Updating person with ID: ${id}`);

    // Verify person exists
    await this.findOne(id);

    // Check for duplicate name if updating name
    if (updatePersonDto.name) {
      const existing = await this.personRepository.findByName(updatePersonDto.name);
      if (existing && existing.person_id !== id) {
        throw new ConflictException(`Person "${updatePersonDto.name}" already exists`);
      }
    }

    try {
      // Transform date string to Date object
      const updateData: Partial<Person> = {
        ...updatePersonDto,
        date_of_birth: updatePersonDto.date_of_birth
          ? new Date(updatePersonDto.date_of_birth)
          : undefined,
      };

      const updatedPerson = await this.personRepository.update(id, updateData);
      this.logger.log(`Person updated successfully: ${id}`);
      return updatedPerson;
    } catch (error) {
      this.logger.error(`Failed to update person ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a person
   * Note: Will fail if person has credits assigned (foreign key constraint)
   * @param id - Person UUID
   * @returns true if deleted successfully
   * @throws NotFoundException if person doesn't exist
   */
  async remove(id: string): Promise<boolean> {
    this.logger.log(`Deleting person with ID: ${id}`);

    // Verify person exists
    await this.findOne(id);

    try {
      const deleted = await this.personRepository.delete(id);
      this.logger.log(`Person deleted successfully: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete person ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a person exists
   * @param id - Person UUID
   * @returns true if exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    return await this.personRepository.exists(id);
  }
}
