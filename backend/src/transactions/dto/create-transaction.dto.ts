import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(['income', 'expense'])
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccount?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  isFixed?: boolean;
}
