import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Family } from '../schemas/family.schema';

describe('FamilyController', () => {
  let controller: FamilyController;
  let service: FamilyService;

  const mockFamilyService = {
    create: jest.fn(),
    join: jest.fn(),
    joinByInviteCode: jest.fn(),
    leave: jest.fn(),
    getMembers: jest.fn(),
    removeMember: jest.fn(),
    addCustomCategory: jest.fn(),
    addBankAccount: jest.fn(),
    removeBankAccount: jest.fn(),
    approveMember: jest.fn(),
    rejectMember: jest.fn(),
    getPendingMembers: jest.fn(),
  };

  const mockFamilyModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        {
          provide: FamilyService,
          useValue: mockFamilyService,
        },
        {
          provide: getModelToken(Family.name),
          useValue: mockFamilyModel,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FamilyController>(FamilyController);
    service = module.get<FamilyService>(FamilyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a family', async () => {
      const createDto = { name: 'New Family' };
      const req = { user: { _id: 'userId' } };
      mockFamilyService.create.mockResolvedValue({
        _id: 'familyId',
        ...createDto,
      });

      const result = await controller.create(createDto, req);

      expect(result._id).toBe('familyId');
      expect(service.create).toHaveBeenCalledWith(createDto, 'userId');
    });
  });

  describe('join', () => {
    it('should join a family by familyCode', async () => {
      const joinDto = { familyCode: 'ABC123' };
      const req = { user: { _id: 'userId' } };
      mockFamilyService.join.mockResolvedValue(undefined);

      await controller.join(joinDto, req);

      expect(service.join).toHaveBeenCalledWith('ABC123', 'userId');
    });
  });

  describe('getMembers', () => {
    it('should return family members', async () => {
      const req = { user: { familyId: 'familyId' } };
      mockFamilyService.getMembers.mockResolvedValue([
        { _id: 'userId', name: 'User' },
      ]);

      const result = await controller.getMembers(req);

      expect(result).toHaveLength(1);
      expect(service.getMembers).toHaveBeenCalledWith('familyId');
    });
  });
});
