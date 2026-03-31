import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { Transaction } from '../schemas/transaction.schema';
import { Model } from 'mongoose';

describe('ReportsService', () => {
  let service: ReportsService;
  let transactionModel: Model<Transaction>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            aggregate: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    transactionModel = module.get<Model<Transaction>>(
      getModelToken(Transaction.name),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFamilySummary', () => {
    it('should return total income and expense', async () => {
      const mockResult = [
        { _id: 'income', total: 1000 },
        { _id: 'expense', total: 400 },
      ];

      jest.spyOn(transactionModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult),
      } as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await service.getFamilySummary(
        '507f1f77bcf86cd799439011',
        startDate,
        endDate,
      );

      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpense).toBe(400);
      expect(result.balance).toBe(600);
    });

    it('should return zeros if no transactions found', async () => {
      jest.spyOn(transactionModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getFamilySummary(
        '507f1f77bcf86cd799439011',
        new Date(),
        new Date(),
      );
      expect(result).toEqual({ totalIncome: 0, totalExpense: 0, balance: 0 });
    });
  });

  describe('getSpendingByCategory', () => {
    it('should return spending grouped by category', async () => {
      const mockResult = [
        { category: 'Food', amount: 200 },
        { category: 'Health', amount: 100 },
      ];

      jest.spyOn(transactionModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult),
      } as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await service.getSpendingByCategory(
        '507f1f77bcf86cd799439011',
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Food');
      expect(result[0].amount).toBe(200);
    });
  });
});
