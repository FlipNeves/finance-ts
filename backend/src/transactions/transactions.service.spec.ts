import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { CategorizationService } from './categorization.service';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';
import { Budget } from '../schemas/budget.schema';
import { User } from '../schemas/user.schema';
import { GoalContribution } from '../schemas/goal-contribution.schema';
import { Model } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionModel: Model<Transaction>;
  let familyModel: Model<Family>;
  let budgetModel: Model<Budget>;
  let contributionModel: Model<GoalContribution>;

  const mockTransaction = {
    _id: '507f1f77bcf86cd799439011',
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
        CategorizationService,
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            aggregate: jest.fn(),
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
        {
          provide: getModelToken(Budget.name),
          useValue: {
            findOne: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: getModelToken(GoalContribution.name),
          useValue: {
            updateMany: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(undefined),
            }),
            deleteMany: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionModel = module.get<Model<Transaction>>(
      getModelToken(Transaction.name),
    );
    familyModel = module.get<Model<Family>>(getModelToken(Family.name));
    budgetModel = module.get<Model<Budget>>(getModelToken(Budget.name));
    contributionModel = module.get<Model<GoalContribution>>(
      getModelToken(GoalContribution.name),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      const createDto = {
        description: 'Grocery',
        amount: 50,
        type: 'income',
        category: 'Food',
        date: new Date(),
      };

      const created = { ...mockTransaction, type: 'income' };
      jest
        .spyOn(transactionModel, 'create')
        .mockResolvedValue(created as any);

      const result = await service.create(createDto, 'userId', 'familyId');

      expect(result).toEqual({ transaction: created, alert: undefined });
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
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockTransaction]),
          }),
        }),
      } as any);

      const result = await service.findAll('familyId', 'userId');

      expect(result).toEqual([mockTransaction]);
      expect(transactionModel.find).toHaveBeenCalledWith({
        familyId: 'familyId',
      });
    });

    it('should scope to userId when there is no family', async () => {
      jest.spyOn(transactionModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await service.findAll(null, 'userId');

      expect(transactionModel.find).toHaveBeenCalledWith({
        userId: 'userId',
        familyId: null,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single transaction scoped to the owner', async () => {
      jest.spyOn(transactionModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTransaction),
      } as any);

      const result = await service.findOne(
        mockTransaction._id,
        'familyId',
        'userId',
      );

      expect(result).toEqual(mockTransaction);
      expect(transactionModel.findOne).toHaveBeenCalledWith({
        _id: mockTransaction._id,
        familyId: 'familyId',
      });
    });

    it('should throw NotFoundException if transaction is outside the scope', async () => {
      jest.spyOn(transactionModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.findOne(mockTransaction._id, null, 'otherUser'),
      ).rejects.toThrow(NotFoundException);
      expect(transactionModel.findOne).toHaveBeenCalledWith({
        _id: mockTransaction._id,
        userId: 'otherUser',
        familyId: null,
      });
    });
  });

  describe('update', () => {
    it('should update a transaction scoped to the owner', async () => {
      const updateDto = { amount: 60 };
      jest.spyOn(transactionModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockTransaction, ...updateDto }),
      } as any);

      const result = await service.update(
        mockTransaction._id,
        updateDto,
        'familyId',
        'userId',
      );

      expect(result.amount).toBe(60);
      expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTransaction._id, familyId: 'familyId' },
        updateDto,
        { new: true },
      );
    });

    it('should not allow reassigning ownership via the update payload', async () => {
      jest.spyOn(transactionModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTransaction),
      } as any);

      await service.update(
        mockTransaction._id,
        { amount: 70, userId: 'attacker', familyId: 'otherFamily' },
        null,
        'userId',
      );

      expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockTransaction._id, userId: 'userId', familyId: null },
        { amount: 70 },
        { new: true },
      );
    });

    it('should throw NotFoundException if transaction is outside the scope', async () => {
      jest.spyOn(transactionModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.update(mockTransaction._id, { amount: 60 }, null, 'otherUser'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a transaction scoped to the owner', async () => {
      jest.spyOn(transactionModel, 'findOneAndDelete').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTransaction),
      } as any);

      await service.remove(mockTransaction._id, 'familyId', 'userId');

      expect(transactionModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockTransaction._id,
        familyId: 'familyId',
      });
      expect(contributionModel.deleteMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if transaction is outside the scope', async () => {
      jest.spyOn(transactionModel, 'findOneAndDelete').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.remove(mockTransaction._id, null, 'otherUser'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('quickCreate', () => {
    beforeEach(() => {
      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFamily),
      } as any);
      jest.spyOn(budgetModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest
        .spyOn(transactionModel, 'create')
        .mockImplementation(async (data: any) => data);
    });

    it('parses "15 padaria" into an expense categorized as Food', async () => {
      const result = await service.quickCreate('15 padaria', undefined, 'userId', 'familyId');

      expect(result.parsed).toMatchObject({
        amount: 15,
        description: 'padaria',
        type: 'expense',
        category: 'Food',
      });
      expect(transactionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 15, type: 'expense', isFixed: false }),
      );
    });

    it('parses "+2000 salário" into an income categorized as Salary', async () => {
      const result = await service.quickCreate('+2000 salário', undefined, 'userId', 'familyId');

      expect(result.parsed).toMatchObject({
        amount: 2000,
        type: 'income',
        category: 'Salary',
      });
    });

    it('parses pt-BR formatted amounts like "1.234,56 aluguel"', async () => {
      const result = await service.quickCreate('1.234,56 aluguel', undefined, 'userId', 'familyId');

      expect(result.parsed).toMatchObject({
        amount: 1234.56,
        description: 'aluguel',
        category: 'Housing',
      });
    });

    it('rejects text without an amount', async () => {
      await expect(
        service.quickCreate('padaria', undefined, 'userId', 'familyId'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects text without a description', async () => {
      await expect(
        service.quickCreate('R$ 15', undefined, 'userId', 'familyId'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCategories', () => {
    it('should return default and custom categories for a family', async () => {
      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFamily),
      } as any);

      const result = await service.getCategories('familyId', 'userId');

      expect(result).toContain('Health');
      expect(result).toContain('Food');
    });
  });
});
