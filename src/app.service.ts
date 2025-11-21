import { Injectable } from '@nestjs/common';
import { SeedService } from './seed/seed.service';

@Injectable()
export class AppService {
  constructor(private readonly seedService: SeedService) {}

  getHello(): string {
    return 'CMS Backend API is running! 🚀';
  }

  async seedDatabase() {
    try {
      await this.seedService.seedAll();
      return {
        success: true,
        message: 'Database seeded successfully!',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to seed database',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
