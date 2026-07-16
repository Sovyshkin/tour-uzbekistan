import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'tour-uzbekistan-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
