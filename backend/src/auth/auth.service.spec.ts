import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { User } from '../schemas/user.schema';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = { email: 'test@test.com', password: 'password', name: 'Test User' };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockUserModel.create.mockResolvedValue({
        email: registerDto.email,
        name: registerDto.name,
        _id: 'mockId',
      });

      const result = await service.register(registerDto);
      expect(result).toEqual({
        email: registerDto.email,
        name: registerDto.name,
        _id: 'mockId',
      });
    });

    it('should throw error if user already exists', async () => {
      const registerDto = { email: 'test@test.com', password: 'password', name: 'Test User' };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ email: 'test@test.com' }) });

      await expect(service.register(registerDto)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = { email: 'test@test.com', password: 'password' };
      const mockUser = {
        email: loginDto.email,
        passwordHash: 'hashedPassword',
        _id: 'mockId',
      };
      
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });
      jest.spyOn(service as any, 'comparePassword').mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mockToken');

      const result = await service.login(loginDto);
      expect(result).toEqual({ accessToken: 'mockToken' });
    });

    it('should throw error for invalid credentials', async () => {
      const loginDto = { email: 'test@test.com', password: 'password' };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });
});
