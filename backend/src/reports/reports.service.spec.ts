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
    transactionModel = module.get<Model<Transaction>>(getModelToken(Transaction.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFamilySummary', () => {
    it('should return total income and expense', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      await expect(service.getFamilySummary('familyId', startDate, endDate)).rejects.toThrow('Not implemented');
    });
  });

  describe('getSpendingByCategory', () => {
    it('should return spending grouped by category', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      await expect(service.getSpendingByCategory('familyId', startDate, endDate)).rejects.toThrow('Not implemented');
    });
  });
});
