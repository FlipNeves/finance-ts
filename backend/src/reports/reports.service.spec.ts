import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { Transaction } from '../schemas/transaction.schema';
import { Budget } from '../schemas/budget.schema';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockUserId = '507f1f77bcf86cd799439012';

  const mockTransactionModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  const mockBudgetModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Defaults: no biggest expense, no budget configured
    mockTransactionModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockBudgetModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Budget.name),
          useValue: mockBudgetModel,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFamilySummary', () => {
    it('should return total income and expense', async () => {
      const mockResult = [
        { _id: { type: 'income', isFixed: false }, total: 1000 },
        { _id: { type: 'expense', isFixed: false }, total: 400 },
      ];

      mockTransactionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult),
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await service.getFamilySummary(
        '507f1f77bcf86cd799439011',
        mockUserId,
        startDate,
        endDate,
      );

      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpense).toBe(400);
      expect(result.balance).toBe(600);
    });

    it('should return zeros if no transactions found', async () => {
      mockTransactionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getFamilySummary(
        '507f1f77bcf86cd799439011',
        mockUserId,
        new Date(),
        new Date(),
      );

      expect(result).toEqual({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        fixedExpense: 0,
        variableExpense: 0,
        biggestExpense: null,
        previousMonthIncome: 0,
        previousMonthExpense: 0,
        budgetLimit: 0,
      });
    });
  });

  describe('getSpendingByCategory', () => {
    it('should return spending grouped by category', async () => {
      const mockResult = [
        { category: 'Food', amount: 200 },
        { category: 'Health', amount: 100 },
      ];

      mockTransactionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult),
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await service.getSpendingByCategory(
        '507f1f77bcf86cd799439011',
        mockUserId,
        startDate,
        endDate,
      );

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Food');
      expect(result[0].amount).toBe(200);
    });
  });
});
