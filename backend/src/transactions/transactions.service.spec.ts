import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionModel: Model<Transaction>;
  let familyModel: Model<Family>;

  const mockTransaction = {
    _id: 'transId',
    description: 'Grocery',
    amount: 50,
    type: 'expense',
    category: 'Food',
    date: new Date(),
    familyId: 'familyId',
    userId: 'userId',
  };

  const mockFamily = {
    _id: 'familyId',
    name: 'Test Family',
    customCategories: ['Health'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: getModelToken(Family.name),
          useValue: {
            findById: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionModel = module.get<Model<Transaction>>(
      getModelToken(Transaction.name),
    );
    familyModel = module.get<Model<Family>>(getModelToken(Family.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      const createDto = {
        description: 'Grocery',
        amount: 50,
        type: 'expense',
        category: 'Food',
        date: new Date(),
      };

      jest
        .spyOn(transactionModel, 'create')
        .mockResolvedValue(mockTransaction as any);

      const result = await service.create(createDto, 'userId', 'familyId');

      expect(result).toEqual(mockTransaction);
      expect(transactionModel.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 'userId',
        familyId: 'familyId',
      });
    });
  });

  describe('findAll', () => {
    it('should return all transactions for a family', async () => {
      jest.spyOn(transactionModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockTransaction]),
        }),
      } as any);

      const result = await service.findAll('familyId');

      expect(result).toEqual([mockTransaction]);
      expect(transactionModel.find).toHaveBeenCalledWith({
        familyId: 'familyId',
      });
    });
  });

  describe('findOne', () => {
    it('should return a single transaction', async () => {
      jest.spyOn(transactionModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTransaction),
      } as any);

      const result = await service.findOne('transId');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      jest.spyOn(transactionModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findOne('invalidId')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const updateDto = { amount: 60 };
      jest.spyOn(transactionModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockTransaction, ...updateDto }),
      } as any);

      const result = await service.update('transId', updateDto);

      expect(result.amount).toBe(60);
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      jest.spyOn(transactionModel, 'findByIdAndDelete').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTransaction),
      } as any);

      await service.remove('transId');

      expect(transactionModel.findByIdAndDelete).toHaveBeenCalledWith(
        'transId',
      );
    });
  });

  describe('getCategories', () => {
    it('should return default and custom categories for a family', async () => {
      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFamily),
      } as any);

      const result = await service.getCategories('familyId');

      // Assuming some default categories exist
      expect(result).toContain('Health');
      expect(result).toContain('Food');
    });
  });
});
