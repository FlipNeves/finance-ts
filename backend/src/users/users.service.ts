import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { User } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Generates a short-lived token for linking a Telegram account.
   * Token expires in 10 minutes.
   */
  async generateTelegramLinkToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.telegramLinkToken = token;
    user.telegramLinkTokenExpiresAt = expiresAt;
    await user.save();

    return { token, expiresAt };
  }

  /**
   * Removes the Telegram link from the user's account.
   */
  async unlinkTelegram(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.telegramChatId = null;
    user.telegramLinkToken = null;
    user.telegramLinkTokenExpiresAt = null;
    await user.save();
  }
}
