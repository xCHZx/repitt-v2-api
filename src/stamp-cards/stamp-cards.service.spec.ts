import { Test, TestingModule } from '@nestjs/testing';
import { StampCardsService } from './stamp-cards.service';

describe('StampCardsService', () => {
  let service: StampCardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StampCardsService],
    }).compile();

    service = module.get<StampCardsService>(StampCardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
