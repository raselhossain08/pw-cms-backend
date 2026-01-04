import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseIndexService implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection) {}

  async onModuleInit() {
    await this.createIndexes();
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');

    try {
      // Courses indexes
      await this.connection.collection('courses').createIndex(
        { instructor: 1, status: 1 },
        { name: 'instructor_status_idx' }
      );
      await this.connection.collection('courses').createIndex(
        { status: 1, isFeatured: 1 },
        { name: 'status_featured_idx' }
      );
      await this.connection.collection('courses').createIndex(
        { categories: 1 },
        { name: 'categories_idx' }
      );
      await this.connection.collection('courses').createIndex(
        { createdAt: -1 },
        { name: 'created_desc_idx' }
      );
      await this.connection.collection('courses').createIndex(
        { slug: 1 },
        { unique: true, name: 'slug_unique_idx' }
      );
      await this.connection.collection('courses').createIndex(
        { title: 'text', description: 'text' },
        { name: 'search_text_idx' }
      );

      // Enrollments indexes
      await this.connection.collection('enrollments').createIndex(
        { student: 1, course: 1 },
        { unique: true, name: 'student_course_unique_idx' }
      );
      await this.connection.collection('enrollments').createIndex(
        { student: 1, status: 1 },
        { name: 'student_status_idx' }
      );
      await this.connection.collection('enrollments').createIndex(
        { course: 1 },
        { name: 'course_idx' }
      );
      await this.connection.collection('enrollments').createIndex(
        { lastAccessedAt: -1 },
        { name: 'last_accessed_desc_idx' }
      );

      // Users indexes
      await this.connection.collection('users').createIndex(
        { email: 1 },
        { unique: true, name: 'email_unique_idx' }
      );
      await this.connection.collection('users').createIndex(
        { role: 1 },
        { name: 'role_idx' }
      );
      await this.connection.collection('users').createIndex(
        { createdAt: -1 },
        { name: 'created_desc_idx' }
      );

      // Lessons indexes
      await this.connection.collection('lessons').createIndex(
        { course: 1, order: 1 },
        { name: 'course_order_idx' }
      );
      await this.connection.collection('lessons').createIndex(
        { module: 1 },
        { name: 'module_idx' }
      );

      // Orders indexes
      await this.connection.collection('orders').createIndex(
        { user: 1, status: 1 },
        { name: 'user_status_idx' }
      );
      await this.connection.collection('orders').createIndex(
        { createdAt: -1 },
        { name: 'created_desc_idx' }
      );

      // Payments indexes
      await this.connection.collection('payments').createIndex(
        { order: 1 },
        { name: 'order_idx' }
      );
      await this.connection.collection('payments').createIndex(
        { user: 1, status: 1 },
        { name: 'user_status_idx' }
      );
      await this.connection.collection('payments').createIndex(
        { transactionId: 1 },
        { unique: true, sparse: true, name: 'transaction_unique_idx' }
      );

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Failed to create indexes:', error.message);
    }
  }
}

