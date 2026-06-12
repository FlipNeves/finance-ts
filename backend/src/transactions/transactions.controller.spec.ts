import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { StatementImportService } from './statement-import.service';
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

  const mockStatementImportService = {
    preview: jest.fn(),
    commit: jest.fn(),
    undoBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: StatementImportService,
          useValue: mockStatementImportService,
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
      const createDto = {
        description: 'Test',
        amount: 10,
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString(),
      };
      const req = { user: { _id: 'userId', familyId: 'familyId' } };
      mockTransactionsService.create.mockResolvedValue({
        _id: 'id',
        ...createDto,
      });

      const result = await controller.create(createDto, req);

      expect(result._id).toBe('id');
      expect(service.create).toHaveBeenCalledWith(
        createDto,
        'userId',
        'familyId',
      );
    });
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      const req = { user: { _id: 'userId', familyId: 'familyId' } };
      mockTransactionsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(req, {});

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith('familyId', 'userId', {});
    });
  });

  describe('getCategories', () => {
    it('should return categories', async () => {
      const req = { user: { _id: 'userId', familyId: 'familyId' } };
      mockTransactionsService.getCategories.mockResolvedValue(['Food']);

      const result = await controller.getCategories(req);

      expect(result).toEqual(['Food']);
      expect(service.getCategories).toHaveBeenCalledWith('familyId', 'userId');
    });
  });

  describe('findOne', () => {
    it('should scope lookup to the requesting user', async () => {
      const req = { user: { _id: 'userId', familyId: null } };
      mockTransactionsService.findOne.mockResolvedValue({ _id: 'id' });

      await controller.findOne('id', req);

      expect(service.findOne).toHaveBeenCalledWith('id', null, 'userId');
    });
  });

  describe('update', () => {
    it('should scope update to the requesting user', async () => {
      const req = { user: { _id: 'userId', familyId: 'familyId' } };
      mockTransactionsService.update.mockResolvedValue({ _id: 'id' });

      await controller.update('id', { amount: 10 }, req);

      expect(service.update).toHaveBeenCalledWith(
        'id',
        { amount: 10 },
        'familyId',
        'userId',
      );
    });
  });

  describe('remove', () => {
    it('should scope removal to the requesting user', async () => {
      const req = { user: { _id: 'userId', familyId: null } };
      mockTransactionsService.remove.mockResolvedValue(undefined);

      await controller.remove('id', req);

      expect(service.remove).toHaveBeenCalledWith('id', null, 'userId');
    });
  });
});
