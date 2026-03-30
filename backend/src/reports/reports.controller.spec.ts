import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    getFamilySummary: jest.fn(),
    getSpendingByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should return summary for a date range', async () => {
      const mockSummary = { totalIncome: 100, totalExpense: 50, balance: 50 };
      const req = { user: { familyId: 'familyId' } };
      mockReportsService.getFamilySummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(req, '2024-01-01', '2024-01-31');
      
      expect(result).toEqual(mockSummary);
      expect(service.getFamilySummary).toHaveBeenCalledWith('familyId', expect.any(Date), expect.any(Date));
    });
  });

  describe('getSpendingByCategory', () => {
    it('should return spending by category', async () => {
      const mockSpending = [{ category: 'Food', amount: 100 }];
      const req = { user: { familyId: 'familyId' } };
      mockReportsService.getSpendingByCategory.mockResolvedValue(mockSpending);

      const result = await controller.getSpendingByCategory(req, '2024-01-01', '2024-01-31');
      
      expect(result).toEqual(mockSpending);
      expect(service.getSpendingByCategory).toHaveBeenCalledWith('familyId', expect.any(Date), expect.any(Date));
    });
  });
});
