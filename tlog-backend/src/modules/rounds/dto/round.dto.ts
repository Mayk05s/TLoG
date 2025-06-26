import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class RoundDto {
  @Expose()
  @ApiProperty({ description: 'Round ID' })
  id: string;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  @ApiProperty({ description: 'Round start time (timestamp)' })
  startsAt: number;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  @ApiProperty({ description: 'Round end time (timestamp)' })
  endsAt: number;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  @ApiProperty({ description: 'Round creation time (timestamp)' })
  createdAt: number;

  constructor(partial: any) {
    // Просто присваиваем все поля - Transform декораторы сделают свою работу при сериализации
    Object.assign(this, partial);
  }
}
