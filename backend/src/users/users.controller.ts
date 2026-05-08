import { Controller, Get, Post, Delete, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user._id);
  }

  /**
   * Generates a token for linking a Telegram account.
   * The user must send this token to the Telegram bot via /start <token>.
   */
  @Post('telegram-link-token')
  async generateTelegramLinkToken(@Req() req: any) {
    const result = await this.usersService.generateTelegramLinkToken(req.user._id);
    return {
      token: result.token,
      expiresAt: result.expiresAt,
      botUsername: 'verdant_cash_bot',
      deepLink: `https://t.me/verdant_cash_bot?start=${result.token}`,
    };
  }

  /**
   * Removes the Telegram link from the user's account.
   */
  @Delete('telegram-link')
  async unlinkTelegram(@Req() req: any) {
    await this.usersService.unlinkTelegram(req.user._id);
    return { success: true, message: 'Telegram account unlinked' };
  }
}
