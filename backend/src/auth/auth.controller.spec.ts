import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@test.com',
        password: 'password',
        name: 'Test User',
      };
      mockAuthService.register.mockResolvedValue({
        email: registerDto.email,
        _id: 'mockId',
      });

      const result = await controller.register(registerDto);
      expect(result).toEqual({ email: registerDto.email, _id: 'mockId' });
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user and return access token', async () => {
      const loginDto = { email: 'test@test.com', password: 'password' };
      mockAuthService.login.mockResolvedValue({ accessToken: 'mockToken' });

      const result = await controller.login(loginDto);
      expect(result).toEqual({ accessToken: 'mockToken' });
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });
});
