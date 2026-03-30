import { Test, TestingModule } from '@nestjs/testing';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('FamilyController', () => {
  let controller: FamilyController;
  let service: FamilyService;

  const mockFamilyService = {
    create: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    getMembers: jest.fn(),
    removeMember: jest.fn(),
    addCustomCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        {
          provide: FamilyService,
          useValue: mockFamilyService,
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
      mockFamilyService.create.mockResolvedValue({ _id: 'familyId', ...createDto });

      const result = await controller.create(createDto, req);
      
      expect(result._id).toBe('familyId');
      expect(service.create).toHaveBeenCalledWith(createDto, 'userId');
    });
  });

  describe('join', () => {
    it('should join a family', async () => {
      const joinDto = { familyCode: 'ABC123' };
      const req = { user: { _id: 'userId' } };
      mockFamilyService.join.mockResolvedValue({ _id: 'familyId', familyCode: 'ABC123' });

      const result = await controller.join(joinDto, req);
      
      expect(result._id).toBe('familyId');
      expect(service.join).toHaveBeenCalledWith('ABC123', 'userId');
    });
  });

  describe('getMembers', () => {
    it('should return family members', async () => {
      const req = { user: { familyId: 'familyId' } };
      mockFamilyService.getMembers.mockResolvedValue([{ _id: 'userId', name: 'User' }]);

      const result = await controller.getMembers(req);
      
      expect(result).toHaveLength(1);
      expect(service.getMembers).toHaveBeenCalledWith('familyId');
    });
  });
});
