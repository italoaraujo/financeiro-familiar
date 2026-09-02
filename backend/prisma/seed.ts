import { PrismaClient, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  const defaultCategories = [
    // Despesas
    { name: 'Alimentação', type: TransactionType.EXPENSE, icon: 'Utensils', color: '#ef4444' },
    { name: 'Moradia', type: TransactionType.EXPENSE, icon: 'Home', color: '#f97316' },
    { name: 'Transporte', type: TransactionType.EXPENSE, icon: 'Car', color: '#eab308' },
    { name: 'Saúde', type: TransactionType.EXPENSE, icon: 'HeartPulse', color: '#ec4899' },
    { name: 'Educação', type: TransactionType.EXPENSE, icon: 'GraduationCap', color: '#8b5cf6' },
    { name: 'Lazer & Cultura', type: TransactionType.EXPENSE, icon: 'Gamepad2', color: '#06b6d4' },
    { name: 'Vestuário', type: TransactionType.EXPENSE, icon: 'Shirt', color: '#14b8a6' },
    { name: 'Assinaturas & Serviços', type: TransactionType.EXPENSE, icon: 'Tv', color: '#6366f1' },
    { name: 'Outras Despesas', type: TransactionType.EXPENSE, icon: 'HelpCircle', color: '#64748b' },

    // Receitas
    { name: 'Salário & Remuneração', type: TransactionType.INCOME, icon: 'Briefcase', color: '#10b981' },
    { name: 'Rendimentos & Investimentos', type: TransactionType.INCOME, icon: 'TrendingUp', color: '#3b82f6' },
    { name: 'Freelance & Extras', type: TransactionType.INCOME, icon: 'Coins', color: '#84cc16' },
    { name: 'Presentes & Bonificações', type: TransactionType.INCOME, icon: 'Gift', color: '#a855f7' },
    { name: 'Outras Receitas', type: TransactionType.INCOME, icon: 'PlusCircle', color: '#22c55e' },
  ];

  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        isSystemDefault: true,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystemDefault: true,
        },
      });
    }
  }

  // Demo user: admin@exemplo.com / 123456 (only created in development environment)
  const currentEnv = (process.env.APP_ENV || 'development').toLowerCase();

  if (currentEnv === 'development') {
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@exemplo.com' },
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const demoUser = await prisma.user.create({
        data: {
          name: 'Usuário Demo',
          email: 'admin@exemplo.com',
          passwordHash,
        },
      });

      const demoFamily = await prisma.family.create({
        data: {
          name: 'Família Silva',
          description: 'Finanças compartilhadas do lar',
          ownerId: demoUser.id,
        },
      });

      await prisma.familyMember.create({
        data: {
          familyId: demoFamily.id,
          userId: demoUser.id,
          role: 'OWNER',
        },
      });

      console.log('Demo user and family created: admin@exemplo.com / 123456');
    }
  } else {
    console.log(`Skipping demo user creation for environment: '${currentEnv}'`);
  }

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
