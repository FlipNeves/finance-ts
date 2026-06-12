import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class QuickTransactionDto {
  // Free-form entry like "15 padaria" or "+2000 salário".
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  text: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
