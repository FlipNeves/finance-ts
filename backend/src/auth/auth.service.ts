import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: any) {
    const { email, password, name } = registerDto;
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate a unique invite code for the user
    let inviteCode = '';
    let isUnique = false;
    while (!isUnique) {
      inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      const existing = await this.userModel.findOne({ inviteCode }).exec();
      if (!existing) isUnique = true;
    }

    const newUser = await this.userModel.create({
      email,
      passwordHash,
      name,
      inviteCode,
    });

    return {
      email: newUser.email,
      name: newUser.name,
      _id: newUser._id,
      inviteCode: newUser.inviteCode,
    };
  }

  async login(loginDto: any) {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email }).exec();

    if (user && (await this.comparePassword(password, user.passwordHash))) {
      const payload = { email: user.email, sub: user._id };
      return {
        accessToken: this.jwtService.sign(payload),
      };
    } else {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
