import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

export interface HealthStatus {
  status: string;
  version: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      version: pkg.version || '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}

