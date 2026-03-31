import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FamilyService } from './family.service';
import { Family } from '../schemas/family.schema';
import { User } from '../schemas/user.schema';
import { Model, Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('FamilyService', () => {
  let service: FamilyService;
  let familyModel: Model<Family>;
  let userModel: Model<User>;

  const mockFamilyId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';

  const mockFamily = {
    _id: mockFamilyId,
    name: 'Test Family',
    familyCode: 'ABC123',
    members: [mockUserId],
    customCategories: [],
    save: jest.fn(),
  };

  const mockUser = {
    _id: mockUserId,
    name: 'Test User',
    familyId: null,
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser.familyId = null;
    mockFamily.customCategories = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: getModelToken(Family.name),
          useValue: {
            new: jest.fn().mockReturnValue(mockFamily),
            constructor: jest.fn().mockReturnValue(mockFamily),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    familyModel = module.get<Model<Family>>(getModelToken(Family.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new family and assign the user to it', async () => {
      const createFamilyDto = { name: 'New Family' };

      mockUser.familyId = null;
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Mock findOne for unique familyCode check
      jest.spyOn(familyModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      jest.spyOn(familyModel, 'create').mockResolvedValue({
        ...mockFamily,
        name: createFamilyDto.name,
        familyCode: 'RANDOM',
      } as any);

      const result = await service.create(createFamilyDto, mockUserId);

      expect(result.name).toBe(createFamilyDto.name);
      expect(result.familyCode).toBeDefined();
      expect(userModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already belongs to a family', async () => {
      const createFamilyDto = { name: 'New Family' };
      const userWithFamily = { ...mockUser, familyId: mockFamilyId };

      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithFamily),
      } as any);

      await expect(service.create(createFamilyDto, mockUserId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('join', () => {
    it('should add user to pending members of a family using a code', async () => {
      mockUser.familyId = null;
      const familyWithPending = {
        ...mockFamily,
        pendingMembers: [],
        save: jest.fn(),
      };

      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      jest.spyOn(familyModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyWithPending),
      } as any);

      await service.join('ABC123', mockUserId);

      expect(familyWithPending.pendingMembers.length).toBe(1);
      expect(familyWithPending.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if family code is invalid', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      jest.spyOn(familyModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.join('INVALID', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('leave', () => {
    it('should remove user from their family', async () => {
      const userWithFamily = {
        ...mockUser,
        familyId: mockFamilyId,
        save: jest.fn(),
      };
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithFamily),
      } as any);

      await service.leave(mockUserId);

      expect(userWithFamily.familyId).toBeNull();
      expect(userWithFamily.save).toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    it('should return all members of a family', async () => {
      const mockMembers = [{ _id: mockUserId, name: 'Test User' }];

      jest.spyOn(userModel, 'find').mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMembers),
        }),
      } as any);

      const result = await service.getMembers(mockFamilyId);

      expect(result).toEqual(mockMembers);
      expect(userModel.find).toHaveBeenCalledWith({
        familyId: new Types.ObjectId(mockFamilyId),
      });
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the family', async () => {
      const ownerId = mockUserId;
      const memberIdToRemove = '507f1f77bcf86cd799439099';
      const member = {
        _id: memberIdToRemove,
        familyId: mockFamilyId,
        save: jest.fn(),
      };
      const familyDoc = {
        ...mockFamily,
        owner: { toString: () => ownerId },
      };

      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyDoc),
      } as any);
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(member),
      } as any);

      await service.removeMember(mockFamilyId, ownerId, memberIdToRemove);

      expect(member.familyId).toBeNull();
      expect(member.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if member is not in the specified family', async () => {
      const ownerId = mockUserId;
      const memberInOtherFamily = {
        _id: 'memberId',
        familyId: 'otherFamilyId',
        save: jest.fn(),
      };
      const familyDoc = {
        ...mockFamily,
        owner: { toString: () => ownerId },
      };

      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyDoc),
      } as any);
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(memberInOtherFamily),
      } as any);

      await expect(
        service.removeMember(mockFamilyId, ownerId, 'memberId'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCustomCategory', () => {
    it('should add a custom category to the family', async () => {
      const familyWithCategories = {
        ...mockFamily,
        customCategories: [],
        save: jest.fn(),
      };

      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyWithCategories),
      } as any);

      await service.addCustomCategory(mockFamilyId, 'Health');

      expect(familyWithCategories.customCategories).toContain('Health');
      expect(familyWithCategories.save).toHaveBeenCalled();
    });
  });

  describe('addBankAccount', () => {
    it('should add a bank account to the family', async () => {
      const familyWithAccounts = {
        ...mockFamily,
        bankAccounts: [],
        save: jest.fn(),
      };

      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyWithAccounts),
      } as any);

      await service.addBankAccount(mockFamilyId, 'NuBank');

      expect(familyWithAccounts.bankAccounts).toContain('NuBank');
      expect(familyWithAccounts.save).toHaveBeenCalled();
    });

    it('should not add duplicate bank accounts', async () => {
      const familyWithAccounts = {
        ...mockFamily,
        bankAccounts: ['NuBank'],
        save: jest.fn(),
      };

      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyWithAccounts),
      } as any);

      await service.addBankAccount(mockFamilyId, 'NuBank');

      expect(familyWithAccounts.bankAccounts.length).toBe(1);
      expect(familyWithAccounts.save).not.toHaveBeenCalled();
    });
  });

  describe('removeBankAccount', () => {
    it('should remove a bank account from the family', async () => {
      const familyWithAccounts = {
        ...mockFamily,
        bankAccounts: ['NuBank'],
        save: jest.fn(),
      };

      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyWithAccounts),
      } as any);

      await service.removeBankAccount(mockFamilyId, 'NuBank');

      expect(familyWithAccounts.bankAccounts).not.toContain('NuBank');
      expect(familyWithAccounts.save).toHaveBeenCalled();
    });
  });
});
