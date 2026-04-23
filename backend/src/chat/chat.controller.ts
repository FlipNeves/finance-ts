import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatRateLimitGuard } from './rate-limit.guard';
import { ChatService } from './chat.service';
import type { ChatConfirmRequest } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard, ChatRateLimitGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('parse')
  @HttpCode(200)
  async parseMessage(
    @Body('message') message: string,
    @Body('language') language: string,
    @Body('context') context: { role: string; content: string }[],
    @Req() req: any,
  ) {
    const lang = language || req.user.preferredLanguage || 'en';
    return this.chatService.parseMessage(message, req.user, lang, context);
  }

  @Post('confirm')
  async confirmTransaction(@Body() data: ChatConfirmRequest, @Req() req: any) {
    const lang = data.language || req.user.preferredLanguage || 'en';
    const result = await this.chatService.confirmTransaction(data, req.user);
    const isPt = lang.startsWith('pt');

    return {
      success: true,
      message: isPt ? '✅ Transação salva com sucesso!' : '✅ Transaction saved successfully!',
      transaction: result.transaction,
      alert: result.alert,
      bankAccountCreated: result.bankAccountCreated || false,
    };
  }
}
