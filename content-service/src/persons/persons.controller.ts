import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PersonsService } from './persons.service';
import { CreatePersonDto, UpdatePersonDto } from './dto';
import { JwtAuthGuard, Roles, RolesGuard, UserRole as Role, Public } from '@libs/common';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  /**
   * Create a new person (Admin only)
   * POST /api/persons
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPersonDto: CreatePersonDto) {
    return await this.personsService.create(createPersonDto);
  }

  /**
   * Get all persons with pagination (Public)
   * GET /api/persons/?page=1&limit=20
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const [persons, total] = await this.personsService.findAll(page, limit);
    return {
      data: persons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search persons by name (Public)
   * GET /api/persons/search?q=bryan&limit=10
   */
  @Get('search')
  @Public()
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.personsService.search(query, limit);
  }

  /**
   * Get single person by ID (Public)
   * GET /api/persons/:id
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.personsService.findOne(id);
  }

  /**
   * Update a person (Admin only)
   * PATCH /api/persons/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updatePersonDto: UpdatePersonDto,
  ) {
    return await this.personsService.update(id, updatePersonDto);
  }

  /**
   * Delete a person (Admin only)
   * DELETE /api/persons/:id
   * Note: Will fail if person has credits assigned
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.personsService.remove(id);
  }
}
