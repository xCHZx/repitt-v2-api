import { Test, TestingModule } from '@nestjs/testing';
import { StampCardsController } from './stamp-cards.controller';

describe('StampCardsController', () => {
  let controller: StampCardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StampCardsController],
    }).compile();

    controller = module.get<StampCardsController>(StampCardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
