import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FamiliesModule } from './modules/families/families.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CreditCardsModule } from './modules/credit-cards/credit-cards.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    FamiliesModule,
    AccountsModule,
    CreditCardsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
