import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; message: string; timestamp: string } {
    return {
      status: 'healthy',
      message: 'TaskTimeFlow API is running successfully',
      timestamp: new Date().toISOString(),
    };
  }
}