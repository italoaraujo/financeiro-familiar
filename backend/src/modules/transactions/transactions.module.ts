import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [CreditCardsModule, TagsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
