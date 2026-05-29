import { Test, TestingModule } from '@nestjs/testing';
import { DriversAppGateway } from './drivers-app.gateway';

describe('DriversAppGateway', () => {
  let gateway: DriversAppGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DriversAppGateway],
    }).compile();

    gateway = module.get<DriversAppGateway>(DriversAppGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
