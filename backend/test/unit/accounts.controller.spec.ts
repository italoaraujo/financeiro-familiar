import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AccountsController } from '../../src/modules/accounts/accounts.controller';
import { AccountsService } from '../../src/modules/accounts/accounts.service';

describe('AccountsController', () => {
  let controller: AccountsController;
  let accountsService: {
    favorite: jest.Mock;
    unfavorite: jest.Mock;
  };

  const baseAccount = {
    id: 'acc-1',
    userId: 'user-1',
    familyId: null,
    name: 'Nubank',
    isArchived: false,
    isActive: true,
  };

  beforeEach(async () => {
    accountsService = {
      favorite: jest.fn(),
      unfavorite: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: accountsService }],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
  });

  describe('favorite', () => {
    it('should delegate to accountsService.favorite and return account with isFavorite: true', async () => {
      const expected = { ...baseAccount, isFavorite: true };
      accountsService.favorite.mockResolvedValue(expected);

      const result = await controller.favorite('user-1', 'acc-1');

      expect(accountsService.favorite).toHaveBeenCalledWith('user-1', 'acc-1');
      expect(result).toEqual(expected);
    });

    it('should propagate BadRequestException (400) when favoriting an archived account', async () => {
      accountsService.favorite.mockRejectedValue(
        new BadRequestException('Não é possível favoritar uma conta arquivada'),
      );

      await expect(controller.favorite('user-1', 'acc-arch')).rejects.toThrow(
        new BadRequestException('Não é possível favoritar uma conta arquivada'),
      );
      expect(accountsService.favorite).toHaveBeenCalledWith('user-1', 'acc-arch');
    });

    it('should propagate ForbiddenException (403) when user has no write access', async () => {
      accountsService.favorite.mockRejectedValue(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      await expect(controller.favorite('user-viewer', 'acc-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
    });

    it('should propagate NotFoundException (404) when account does not exist or is soft-deleted', async () => {
      accountsService.favorite.mockRejectedValue(
        new NotFoundException('Conta não encontrada'),
      );

      await expect(controller.favorite('user-1', 'acc-missing')).rejects.toThrow(
        new NotFoundException('Conta não encontrada'),
      );
    });
  });

  describe('unfavorite', () => {
    it('should delegate to accountsService.unfavorite and return account with isFavorite: false', async () => {
      const expected = { ...baseAccount, isFavorite: false };
      accountsService.unfavorite.mockResolvedValue(expected);

      const result = await controller.unfavorite('user-1', 'acc-1');

      expect(accountsService.unfavorite).toHaveBeenCalledWith('user-1', 'acc-1');
      expect(result).toEqual(expected);
    });

    it('should propagate ForbiddenException (403) when user has no write access', async () => {
      accountsService.unfavorite.mockRejectedValue(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      await expect(controller.unfavorite('user-viewer', 'acc-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
    });

    it('should propagate NotFoundException (404) when account does not exist or is soft-deleted', async () => {
      accountsService.unfavorite.mockRejectedValue(
        new NotFoundException('Conta não encontrada'),
      );

      await expect(controller.unfavorite('user-1', 'acc-missing')).rejects.toThrow(
        new NotFoundException('Conta não encontrada'),
      );
    });
  });
});
