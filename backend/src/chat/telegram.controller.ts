import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('chat/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private configService: ConfigService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() update: any) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken || botToken.startsWith('your_')) {
      this.logger.warn('Telegram bot token not configured');
      return { ok: true };
    }

    this.logger.log(`Telegram update received: ${JSON.stringify(update?.message?.text || 'no text')}`);

    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (chatId && text) {
      this.logger.log(`Message from chat ${chatId}: ${text}`);

      await this.sendMessage(botToken, chatId, '🚧 Bot em construção. Em breve você poderá registrar transações aqui!');
    }

    return { ok: true };
  }

  private async sendMessage(token: string, chatId: number, text: string): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`);
    }
  }
}
