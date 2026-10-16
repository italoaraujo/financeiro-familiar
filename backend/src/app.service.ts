import { Injectable } from '@nestjs/common';
import { getAppVersion } from './common/utils/version.util';

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
      version: getAppVersion(),
      timestamp: new Date().toISOString(),
    };
  }
}

