import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';
import { Model } from 'mongoose';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionModel: Model<Transaction>;
  let familyModel: Model<Family>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
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
    transactionModel = module.get<Model<Transaction>>(getModelToken(Transaction.name));
    familyModel = module.get<Model<Family>>(getModelToken(Family.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      await expect(service.create({}, 'userId', 'familyId')).rejects.toThrow('Not implemented');
    });
  });

  describe('findAll', () => {
    it('should return all transactions for a family', async () => {
      await expect(service.findAll('familyId')).rejects.toThrow('Not implemented');
    });
  });

  describe('findOne', () => {
    it('should return a single transaction', async () => {
      await expect(service.findOne('id')).rejects.toThrow('Not implemented');
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      await expect(service.update('id', {})).rejects.toThrow('Not implemented');
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      await expect(service.remove('id')).rejects.toThrow('Not implemented');
    });
  });

  describe('getCategories', () => {
    it('should return categories for a family', async () => {
      await expect(service.getCategories('familyId')).rejects.toThrow('Not implemented');
    });
  });
});
