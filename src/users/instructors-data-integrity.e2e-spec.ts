import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Instructor Management - Data Integrity (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let createdInstructorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());

    // Get admin token for authentication
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123',
      });

    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup created test data
    if (createdInstructorId) {
      await request(app.getHttpServer())
        .delete(`/admin/instructors/${createdInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    await connection.close();
    await app.close();
  });

  describe('POST /admin/instructors - Create with all field types', () => {
    it('should create instructor with all valid field types', async () => {
      const instructorData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `test.instructor.${Date.now()}@example.com`,
        phone: '+1234567890',
        country: 'United States',
        specialization: 'Web Development',
        experience: 'intermediate',
        bio: 'Experienced instructor with expertise in full-stack development',
        status: 'active',
        flightHours: 150,
        certifications: ['React Certified', 'Node.js Expert'],
        avatar: 'https://example.com/avatar.jpg',
        coverPhoto: 'https://example.com/cover.jpg',
      };

      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(instructorData)
        .expect(201);

      expect(response.body).toMatchObject({
        firstName: instructorData.firstName,
        lastName: instructorData.lastName,
        email: instructorData.email.toLowerCase(),
        phone: instructorData.phone,
        country: instructorData.country,
        specialization: instructorData.specialization,
        experience: instructorData.experience,
        bio: instructorData.bio,
        status: instructorData.status,
      });

      expect(response.body._id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
      expect(response.body.password).toBeUndefined();

      createdInstructorId = response.body._id;
    });

    it('should validate and reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should validate and reject invalid phone format', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: 'abc-def-ghij',
        })
        .expect(400);

      expect(response.body.message).toContain('phone');
    });

    it('should validate and reject negative flight hours', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test2@example.com',
          flightHours: -100,
        })
        .expect(400);

      expect(response.body.message).toContain('Flight hours');
    });

    it('should validate and reject invalid URL format', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test3@example.com',
          avatar: 'not-a-valid-url',
        })
        .expect(400);

      expect(response.body.message).toContain('URL');
    });

    it('should validate and reject bio exceeding max length', async () => {
      const longBio = 'a'.repeat(2001);
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test4@example.com',
          bio: longBio,
        })
        .expect(400);

      expect(response.body.message).toContain('Bio');
    });

    it('should reject duplicate email address', async () => {
      const email = `duplicate.${Date.now()}@example.com`;

      // Create first instructor
      await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'First',
          lastName: 'User',
          email: email,
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Second',
          lastName: 'User',
          email: email,
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should sanitize input data (trim strings)', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: '  John  ',
          lastName: '  Doe  ',
          email: `  trimtest.${Date.now()}@example.com  `,
          bio: '  This is a bio  ',
        })
        .expect(201);

      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
      expect(response.body.email).not.toContain(' ');
      expect(response.body.bio).toBe('This is a bio');
    });
  });

  describe('PATCH /admin/instructors/:id - Update with transaction', () => {
    let testInstructorId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Update',
          lastName: 'Test',
          email: `updatetest.${Date.now()}@example.com`,
        });

      testInstructorId = response.body._id;
    });

    afterEach(async () => {
      if (testInstructorId) {
        await request(app.getHttpServer())
          .delete(`/admin/instructors/${testInstructorId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    it('should update all field types successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+9876543210',
        specialization: 'Advanced JavaScript',
        experience: 'expert',
        bio: 'Updated bio with new information',
        flightHours: 250,
        certifications: ['AWS Certified', 'Azure Expert'],
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(response.body.updatedAt).toBeDefined();
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(response.body.createdAt).getTime(),
      );
    });

    it('should validate data during update', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email-format',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should prevent duplicate email during update', async () => {
      // Create another instructor
      const anotherResponse = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Another',
          lastName: 'User',
          email: `another.${Date.now()}@example.com`,
        });

      const anotherInstructorId = anotherResponse.body._id;

      // Try to update first instructor with second instructor's email
      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: anotherResponse.body.email,
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/admin/instructors/${anotherInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should maintain data integrity after failed update', async () => {
      // Get original data
      const originalResponse = await request(app.getHttpServer())
        .get(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const originalData = originalResponse.body;

      // Attempt invalid update
      await request(app.getHttpServer())
        .patch(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          flightHours: -500, // Invalid
        })
        .expect(400);

      // Verify data wasn't changed
      const afterFailResponse = await request(app.getHttpServer())
        .get(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(afterFailResponse.body).toMatchObject({
        firstName: originalData.firstName,
        lastName: originalData.lastName,
        email: originalData.email,
      });
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = {
        firstName: 'PartialUpdate',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${testInstructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.firstName).toBe('PartialUpdate');
      // Other fields should remain unchanged
      expect(response.body.lastName).toBe('Test');
    });
  });

  describe('Data consistency across operations', () => {
    it('should maintain data integrity through create-update-delete cycle', async () => {
      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Cycle',
          lastName: 'Test',
          email: `cycle.${Date.now()}@example.com`,
          flightHours: 100,
        })
        .expect(201);

      const instructorId = createResponse.body._id;

      // Verify creation
      expect(createResponse.body.flightHours).toBe(100);

      // Update
      const updateResponse = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          flightHours: 200,
        })
        .expect(200);

      // Verify update
      expect(updateResponse.body.flightHours).toBe(200);

      // Get and verify
      const getResponse = await request(app.getHttpServer())
        .get(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.flightHours).toBe(200);

      // Delete
      await request(app.getHttpServer())
        .delete(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
