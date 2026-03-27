import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

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
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      await expect(controller.create({}, { user: { sub: 'userId', familyId: 'familyId' } })).rejects.toThrow('Not implemented');
    });
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      await expect(controller.findAll({ user: { familyId: 'familyId' } }, {})).rejects.toThrow('Not implemented');
    });
  });

  describe('findOne', () => {
    it('should return a transaction', async () => {
      await expect(controller.findOne('id')).rejects.toThrow('Not implemented');
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      await expect(controller.update('id', {})).rejects.toThrow('Not implemented');
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      await expect(controller.remove('id')).rejects.toThrow('Not implemented');
    });
  });

  describe('getCategories', () => {
    it('should get categories', async () => {
      await expect(controller.getCategories({ user: { familyId: 'familyId' } })).rejects.toThrow('Not implemented');
    });
  });
});
