import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

@Controller('chat/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * Webhook endpoint called by Telegram for every update (message, callback_query, etc).
   * Must always return 200 OK to prevent Telegram from retrying.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
  ) {
    const expectedSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (expectedSecret && expectedSecret !== 'your_secret' && secretToken !== expectedSecret) {
      this.logger.warn('Invalid webhook secret token received');
      return { ok: true };
    }

    try {
      if (update?.callback_query) {
        const cq = update.callback_query;
        const chatId = cq.message?.chat?.id;
        const messageId = cq.message?.message_id;
        const data = cq.data;
        const callbackQueryId = cq.id;

        if (chatId && data && callbackQueryId) {
          await this.telegramService.handleCallbackQuery(
            callbackQueryId,
            chatId,
            messageId,
            data,
          );
        }

        return { ok: true };
      }

      if (update?.message?.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        this.logger.log(`Message from chat ${chatId}: ${text.substring(0, 50)}`);

        await this.telegramService.handleMessage(chatId, text);
      }
    } catch (error) {
      this.logger.error(`Error handling Telegram update: ${error.message}`, error.stack);
    }

    return { ok: true };
  }

  /**
   * Utility endpoint to configure the Telegram webhook.
   * Call this once after deploying to set up the webhook URL.
   * 
   * POST /chat/telegram/setup-webhook
   * Body: { "webhookUrl": "https://your-render-app.onrender.com/chat/telegram/webhook" }
   */
  @Post('setup-webhook')
  @HttpCode(200)
  async setupWebhook(@Body('webhookUrl') webhookUrl: string) {
    if (!webhookUrl) {
      return { ok: false, description: 'webhookUrl is required in the request body' };
    }

    this.logger.log(`Setting up Telegram webhook: ${webhookUrl}`);
    return this.telegramService.setupWebhook(webhookUrl);
  }

  /**
   * Utility endpoint to check current webhook status.
   * 
   * POST /chat/telegram/webhook-info
   */
  @Post('webhook-info')
  @HttpCode(200)
  async getWebhookInfo() {
    return this.telegramService.getWebhookInfo();
  }
}
