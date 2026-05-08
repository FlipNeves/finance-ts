import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    getProfile: jest.fn(),
    generateTelegramLinkToken: jest.fn(),
    unlinkTelegram: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile from request', async () => {
      const mockUser = { _id: 'userId', email: 'test@test.com' };
      const req = { user: { _id: 'userId' } };

      mockUsersService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile(req);

      expect(result).toEqual(mockUser);
      expect(service.getProfile).toHaveBeenCalledWith('userId');
    });
  });
});
