import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class UpdateContentGenresDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one genre must be provided' })
  @IsInt({ each: true })
  genre_ids: number[];
}
