import { Test, TestingModule } from '@nestjs/testing';
import { DriversAppService } from './drivers-app.service';

describe('DriversAppService', () => {
  let service: DriversAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DriversAppService],
    }).compile();

    service = module.get<DriversAppService>(DriversAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
