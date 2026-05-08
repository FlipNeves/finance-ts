import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { TelegramController } from './telegram.controller';
import { ChatService } from './chat.service';
import { TelegramService } from './telegram.service';
import { MessageParserService } from './message-parser.service';
import { LlmService } from './llm.service';
import { ChatRateLimitGuard } from './rate-limit.guard';
import { TransactionsModule } from '../transactions/transactions.module';
import { FamilyModule } from '../family/family.module';
import { User, UserSchema } from '../schemas/user.schema';
import { Family, FamilySchema } from '../schemas/family.schema';
import { TelegramLink, TelegramLinkSchema } from '../schemas/telegram-link.schema';

@Module({
  imports: [
    TransactionsModule,
    FamilyModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Family.name, schema: FamilySchema },
      { name: TelegramLink.name, schema: TelegramLinkSchema },
    ]),
  ],
  controllers: [ChatController, TelegramController],
  providers: [ChatService, TelegramService, MessageParserService, LlmService, ChatRateLimitGuard],
})
export class ChatModule {}
