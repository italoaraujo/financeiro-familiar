import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreditCardsController } from '../../src/modules/credit-cards/credit-cards.controller';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';

describe('CreditCardsController', () => {
  let controller: CreditCardsController;
  let creditCardsService: {
    favorite: jest.Mock;
    unfavorite: jest.Mock;
  };

  const baseCard = {
    id: 'card-1',
    userId: 'user-1',
    familyId: null,
    name: 'Nubank',
    isActive: true,
  };

  beforeEach(async () => {
    creditCardsService = {
      favorite: jest.fn(),
      unfavorite: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditCardsController],
      providers: [{ provide: CreditCardsService, useValue: creditCardsService }],
    }).compile();

    controller = module.get<CreditCardsController>(CreditCardsController);
  });

  describe('favorite', () => {
    it('should delegate to creditCardsService.favorite and return card with isFavorite: true', async () => {
      const expected = { ...baseCard, isFavorite: true };
      creditCardsService.favorite.mockResolvedValue(expected);

      const result = await controller.favorite('user-1', 'card-1');

      expect(creditCardsService.favorite).toHaveBeenCalledWith('user-1', 'card-1');
      expect(result).toEqual(expected);
    });

    it('should propagate BadRequestException (400) when favoriting an archived credit card', async () => {
      creditCardsService.favorite.mockRejectedValue(
        new BadRequestException('Não é possível favoritar um cartão arquivado'),
      );

      await expect(controller.favorite('user-1', 'card-arch')).rejects.toThrow(
        new BadRequestException('Não é possível favoritar um cartão arquivado'),
      );
      expect(creditCardsService.favorite).toHaveBeenCalledWith('user-1', 'card-arch');
    });

    it('should propagate ForbiddenException (403) when user has no write access', async () => {
      creditCardsService.favorite.mockRejectedValue(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      await expect(controller.favorite('user-viewer', 'card-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
    });

    it('should propagate NotFoundException (404) when credit card does not exist or is soft-deleted', async () => {
      creditCardsService.favorite.mockRejectedValue(
        new NotFoundException('Cartão de crédito não encontrado'),
      );

      await expect(controller.favorite('user-1', 'card-missing')).rejects.toThrow(
        new NotFoundException('Cartão de crédito não encontrado'),
      );
    });
  });

  describe('unfavorite', () => {
    it('should delegate to creditCardsService.unfavorite and return card with isFavorite: false', async () => {
      const expected = { ...baseCard, isFavorite: false };
      creditCardsService.unfavorite.mockResolvedValue(expected);

      const result = await controller.unfavorite('user-1', 'card-1');

      expect(creditCardsService.unfavorite).toHaveBeenCalledWith('user-1', 'card-1');
      expect(result).toEqual(expected);
    });

    it('should propagate ForbiddenException (403) when user has no write access', async () => {
      creditCardsService.unfavorite.mockRejectedValue(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      await expect(controller.unfavorite('user-viewer', 'card-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
    });

    it('should propagate NotFoundException (404) when credit card does not exist or is soft-deleted', async () => {
      creditCardsService.unfavorite.mockRejectedValue(
        new NotFoundException('Cartão de crédito não encontrado'),
      );

      await expect(controller.unfavorite('user-1', 'card-missing')).rejects.toThrow(
        new NotFoundException('Cartão de crédito não encontrado'),
      );
    });
  });
});
