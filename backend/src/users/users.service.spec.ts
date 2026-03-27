import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile without passwordHash', async () => {
      const mockUser = {
        _id: 'mockId',
        email: 'test@test.com',
        name: 'Test User',
        passwordHash: 'hashedPassword',
      };
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'mockId',
            email: 'test@test.com',
            name: 'Test User',
          }),
        }),
      });

      const result = await service.getProfile('mockId');
      expect(result).toEqual({
        _id: 'mockId',
        email: 'test@test.com',
        name: 'Test User',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.getProfile('invalidId')).rejects.toThrow('User not found');
    });
  });
});
