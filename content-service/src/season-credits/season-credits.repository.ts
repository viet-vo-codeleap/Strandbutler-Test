import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonCredit } from '../entities/season-credit.entity';

@Injectable()
export class SeasonCreditsRepository {
  constructor(
    @InjectRepository(SeasonCredit)
    private readonly seasonCreditRepo: Repository<SeasonCredit>,
  ) {}

  async create(creditData: Partial<SeasonCredit>): Promise<SeasonCredit> {
    const seasonCredit = this.seasonCreditRepo.create(creditData);
    return await this.seasonCreditRepo.save(seasonCredit);
  }

  async findBySeasonId(seasonId: string): Promise<SeasonCredit[]> {
    return await this.seasonCreditRepo.find({
      where: { season_id: seasonId },
      relations: ['person'],
      order: {
        order: 'ASC',
        person: { name: 'ASC' },
      },
    });
  }

  async findByPersonId(personId: string, page: number = 1, limit: number = 20): Promise<[SeasonCredit[], number]> {
    const skip = (page - 1) * limit;
    return await this.seasonCreditRepo.findAndCount({
      where: { person_id: personId },
      relations: ['season', 'season.series'],
      skip,
      take: limit,
      order: {
        season: { release_date: 'DESC' },
      },
    });
  }

  async findBySeasonPersonRole(seasonId: string, personId: string, role: string): Promise<SeasonCredit | null> {
    return await this.seasonCreditRepo.findOne({
      where: {
        season_id: seasonId,
        person_id: personId,
        role,
      },
    });
  }

  async delete(seasonId: string, personId: string, role: string): Promise<boolean> {
    const result = await this.seasonCreditRepo.delete({
      season_id: seasonId,
      person_id: personId,
      role,
    });
    return (result.affected ?? 0) > 0;
  }

  async deleteBySeasonId(seasonId: string): Promise<void> {
    await this.seasonCreditRepo.delete({ season_id: seasonId });
  }
}
