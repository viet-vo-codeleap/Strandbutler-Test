import { IsString, IsNotEmpty, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;
}
