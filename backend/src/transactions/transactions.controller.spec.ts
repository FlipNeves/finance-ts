import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      const createDto = { description: 'Test', amount: 10, type: 'expense', category: 'Food', date: new Date() };
      const req = { user: { _id: 'userId', familyId: 'familyId' } };
      mockTransactionsService.create.mockResolvedValue({ _id: 'id', ...createDto });

      const result = await controller.create(createDto, req);
      
      expect(result._id).toBe('id');
      expect(service.create).toHaveBeenCalledWith(createDto, 'userId', 'familyId');
    });
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      const req = { user: { familyId: 'familyId' } };
      mockTransactionsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(req, {});
      
      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith('familyId', {});
    });
  });

  describe('getCategories', () => {
    it('should return categories', async () => {
      const req = { user: { familyId: 'familyId' } };
      mockTransactionsService.getCategories.mockResolvedValue(['Food']);

      const result = await controller.getCategories(req);
      
      expect(result).toEqual(['Food']);
      expect(service.getCategories).toHaveBeenCalledWith('familyId');
    });
  });
});
