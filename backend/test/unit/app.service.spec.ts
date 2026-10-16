import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

describe('AppController & AppService Health Check', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('should return health status containing status "ok", package version, and valid ISO timestamp', () => {
      const result = appService.getHealth();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.version).toBe(pkg.version);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return matching response through AppController endpoint handler', () => {
      const result = appController.getHealth();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.version).toBe(pkg.version);
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
