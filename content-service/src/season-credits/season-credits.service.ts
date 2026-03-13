import { Injectable, Logger } from '@nestjs/common';
import { SeasonCreditsRepository } from './season-credits.repository';
import { AddSeasonCreditsDto } from './dto/add-season-credits.dto';
import { SeasonCredit } from '../entities/season-credit.entity';

@Injectable()
export class SeasonCreditsService {
  private readonly logger = new Logger(SeasonCreditsService.name);

  constructor(private readonly seasonCreditsRepository: SeasonCreditsRepository) {}

  async addCredits(seasonId: string, addCreditsDto: AddSeasonCreditsDto): Promise<SeasonCredit[]> {
    this.logger.log(`Adding ${addCreditsDto.credits.length} credits to season ${seasonId}`);

    const addedCredits: SeasonCredit[] = [];

    for (const creditDto of addCreditsDto.credits) {
      // Check for duplicate credit
      const existing = await this.seasonCreditsRepository.findBySeasonPersonRole(
        seasonId,
        creditDto.person_id,
        creditDto.role,
      );

      if (existing) {
        this.logger.log(`Skipping duplicate credit: person ${creditDto.person_id}, role ${creditDto.role}`);
        continue;
      }

      const credit = await this.seasonCreditsRepository.create({
        season_id: seasonId,
        person_id: creditDto.person_id,
        role: creditDto.role,
        character_name: creditDto.character_name || undefined,
        order: creditDto.order || 0,
      });

      addedCredits.push(credit);
    }

    this.logger.log(`Successfully added ${addedCredits.length} credits to season ${seasonId}`);
    return addedCredits;
  }

  async getCreditsBySeason(seasonId: string): Promise<SeasonCredit[]> {
    return await this.seasonCreditsRepository.findBySeasonId(seasonId);
  }

  async getCreditsByPerson(personId: string, page: number, limit: number): Promise<[SeasonCredit[], number]> {
    return await this.seasonCreditsRepository.findByPersonId(personId, page, limit);
  }

  async removeCredit(seasonId: string, personId: string, role: string): Promise<void> {
    await this.seasonCreditsRepository.delete(seasonId, personId, role);
    this.logger.log(`Removed credit for person ${personId} from season ${seasonId}`);
  }
}
