import { Test, TestingModule } from '@nestjs/testing';
import { DriversAppController } from './drivers-app.controller';

describe('DriversAppController', () => {
  let controller: DriversAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversAppController],
    }).compile();

    controller = module.get<DriversAppController>(DriversAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
