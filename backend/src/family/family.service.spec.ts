import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FamilyService } from './family.service';
import { Family } from '../schemas/family.schema';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('FamilyService', () => {
  let service: FamilyService;
  let familyModel: Model<Family>;
  let userModel: Model<User>;

  const mockFamily = {
    _id: 'familyId',
    name: 'Test Family',
    familyCode: 'ABC123',
    members: ['userId'],
    customCategories: [],
    save: jest.fn(),
  };

  const mockUser = {
    _id: 'userId',
    name: 'Test User',
    familyId: null,
    save: jest.fn(),
  };

  beforeEach(async () => {
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

      jest.spyOn(familyModel, 'create').mockResolvedValue({
        ...mockFamily,
        name: createFamilyDto.name,
        familyCode: 'RANDOM',
      } as any);

      const result = await service.create(createFamilyDto, 'userId');
      
      expect(result.name).toBe(createFamilyDto.name);
      expect(result.familyCode).toBeDefined();
      expect(userModel.findById).toHaveBeenCalledWith('userId');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already belongs to a family', async () => {
      const createFamilyDto = { name: 'New Family' };
      const userWithFamily = { ...mockUser, familyId: 'existingFamilyId' };
      
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithFamily),
      } as any);

      await expect(service.create(createFamilyDto, 'userId')).rejects.toThrow(ConflictException);
    });
  });

  describe('join', () => {
    it('should join a family using a code', async () => {
      mockUser.familyId = null;
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      jest.spyOn(familyModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFamily),
      } as any);

      const result = await service.join('ABC123', 'userId');
      
      expect(result._id).toBe(mockFamily._id);
      expect(mockUser.familyId).toBe(mockFamily._id);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if family code is invalid', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      jest.spyOn(familyModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.join('INVALID', 'userId')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    it('should return all members of a family', async () => {
      const mockMembers = [{ _id: 'userId', name: 'Test User' }];
      
      jest.spyOn(userModel, 'find').mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMembers),
        }),
      } as any);

      const result = await service.getMembers('familyId');
      
      expect(result).toEqual(mockMembers);
      expect(userModel.find).toHaveBeenCalledWith({ familyId: 'familyId' });
    });
  });

  describe('addCustomCategory', () => {
    it('should add a custom category to the family', async () => {
      const familyWithCategories = { ...mockFamily, customCategories: [], save: jest.fn() };
      
      jest.spyOn(familyModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(familyWithCategories),
      } as any);

      await service.addCustomCategory('familyId', 'Health');
      
      expect(familyWithCategories.customCategories).toContain('Health');
      expect(familyWithCategories.save).toHaveBeenCalled();
    });
  });
});
