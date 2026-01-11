import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Instructor Specialization Management (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let testInstructorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      });

    adminToken =
      loginResponse.body.accessToken || loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    if (testInstructorId) {
      await connection.collection('users').deleteOne({ _id: testInstructorId });
    }
    await app.close();
  });

  describe('POST /admin/instructors - Create with specialization', () => {
    it('should create instructor with valid specialization', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: `specialization.test.${Date.now()}@example.com`,
        password: 'password123',
        specialization: 'Web Development',
        experience: 'intermediate',
      };

      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);

      testInstructorId = response.body._id;
      expect(response.body.specialization).toBe('Web Development');
      expect(response.body.experience).toBe('intermediate');
    });

    it('should create instructor with long specialization (max 200 chars)', async () => {
      const longSpecialization = 'A'.repeat(200);
      const createDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: `long.specialization.${Date.now()}@example.com`,
        password: 'password123',
        specialization: longSpecialization,
        experience: 'expert',
      };

      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.specialization).toBe(longSpecialization);

      // Clean up
      await connection
        .collection('users')
        .deleteOne({ _id: response.body._id });
    });

    it('should reject specialization longer than 200 characters', async () => {
      const tooLongSpecialization = 'A'.repeat(201);
      const createDto = {
        firstName: 'Test',
        lastName: 'User',
        email: `toolong.${Date.now()}@example.com`,
        password: 'password123',
        specialization: tooLongSpecialization,
      };

      await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should accept valid experience levels', async () => {
      const validExperiences = ['expert', 'advanced', 'intermediate'];

      for (const experience of validExperiences) {
        const createDto = {
          firstName: 'Test',
          lastName: experience,
          email: `exp.${experience}.${Date.now()}@example.com`,
          password: 'password123',
          specialization: 'Testing',
          experience,
        };

        const response = await request(app.getHttpServer())
          .post('/admin/instructors')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createDto)
          .expect(201);

        expect(response.body.experience).toBe(experience);

        // Clean up
        await connection
          .collection('users')
          .deleteOne({ _id: response.body._id });
      }
    });

    it('should reject invalid experience level', async () => {
      const createDto = {
        firstName: 'Test',
        lastName: 'Invalid',
        email: `invalid.exp.${Date.now()}@example.com`,
        password: 'password123',
        specialization: 'Testing',
        experience: 'novice', // Invalid
      };

      await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should create instructor without specialization (optional)', async () => {
      const createDto = {
        firstName: 'No',
        lastName: 'Spec',
        email: `nospec.${Date.now()}@example.com`,
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.specialization).toBeUndefined();

      // Clean up
      await connection
        .collection('users')
        .deleteOne({ _id: response.body._id });
    });
  });

  describe('PATCH /admin/instructors/:id - Update specialization', () => {
    let instructorId: string;

    beforeEach(async () => {
      // Create a test instructor
      const createResponse = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Update',
          lastName: 'Test',
          email: `update.test.${Date.now()}@example.com`,
          password: 'password123',
          specialization: 'Initial Specialization',
          experience: 'intermediate',
        });

      instructorId = createResponse.body._id;
    });

    afterEach(async () => {
      if (instructorId) {
        await connection.collection('users').deleteOne({ _id: instructorId });
      }
    });

    it('should update specialization successfully', async () => {
      const updateDto = {
        specialization: 'Updated Specialization',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.specialization).toBe('Updated Specialization');
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should update experience level successfully', async () => {
      const updateDto = {
        experience: 'expert',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.experience).toBe('expert');
    });

    it('should update both specialization and experience', async () => {
      const updateDto = {
        specialization: 'Advanced JavaScript & React',
        experience: 'expert',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.specialization).toBe('Advanced JavaScript & React');
      expect(response.body.experience).toBe('expert');
    });

    it('should clear specialization when set to empty string', async () => {
      const updateDto = {
        specialization: '',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.specialization).toBe('');
    });

    it('should reject too long specialization on update', async () => {
      const updateDto = {
        specialization: 'A'.repeat(201),
      };

      await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(400);
    });

    it('should reject invalid experience on update', async () => {
      const updateDto = {
        experience: 'beginner', // Invalid
      };

      await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(400);
    });

    it('should trim whitespace from specialization', async () => {
      const updateDto = {
        specialization: '  Web Development  ',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.specialization).toBe('Web Development');
    });

    it('should normalize experience to lowercase', async () => {
      const updateDto = {
        experience: 'EXPERT',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.experience).toBe('expert');
    });
  });

  describe('GET /admin/instructors - Filter by specialization', () => {
    const instructorIds: string[] = [];

    beforeAll(async () => {
      // Create test instructors with different specializations
      const specializations = [
        'Web Development',
        'Mobile Development',
        'Data Science',
        'Web Development', // Duplicate to test filtering
      ];

      for (const spec of specializations) {
        const response = await request(app.getHttpServer())
          .post('/admin/instructors')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            firstName: 'Test',
            lastName: spec.replace(/\s+/g, ''),
            email: `${spec.replace(/\s+/g, '').toLowerCase()}.${Date.now()}.${Math.random()}@example.com`,
            password: 'password123',
            specialization: spec,
            experience: 'intermediate',
          });

        instructorIds.push(response.body._id);
      }
    });

    afterAll(async () => {
      // Clean up
      for (const id of instructorIds) {
        await connection.collection('users').deleteOne({ _id: id });
      }
    });

    it('should filter instructors by specialization', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/instructors')
        .query({ specialization: 'Web Development' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.instructors).toBeInstanceOf(Array);
      expect(response.body.instructors.length).toBeGreaterThanOrEqual(2);

      response.body.instructors.forEach((instructor: any) => {
        if (instructorIds.includes(instructor._id)) {
          expect(instructor.specialization).toBe('Web Development');
        }
      });
    });

    it('should return all instructors when no specialization filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.instructors).toBeInstanceOf(Array);
      expect(response.body.instructors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Data Integrity - Specialization', () => {
    it('should preserve specialization through multiple updates', async () => {
      // Create instructor
      const createResponse = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Integrity',
          lastName: 'Test',
          email: `integrity.${Date.now()}@example.com`,
          password: 'password123',
          specialization: 'Original Specialization',
          experience: 'intermediate',
        });

      const instructorId = createResponse.body._id;
      const originalSpecialization = createResponse.body.specialization;

      // Update other fields
      await request(app.getHttpServer())
        .patch(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
        })
        .expect(200);

      // Verify specialization is preserved
      const getResponse = await request(app.getHttpServer())
        .get(`/admin/instructors/${instructorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.specialization).toBe(originalSpecialization);

      // Clean up
      await connection.collection('users').deleteOne({ _id: instructorId });
    });

    it('should handle special characters in specialization', async () => {
      const specialization = 'C++ & C# Programming (Advanced)';

      const createResponse = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Special',
          lastName: 'Chars',
          email: `special.${Date.now()}@example.com`,
          password: 'password123',
          specialization,
        });

      expect(createResponse.body.specialization).toBe(specialization);

      // Clean up
      await connection
        .collection('users')
        .deleteOne({ _id: createResponse.body._id });
    });

    it('should handle unicode characters in specialization', async () => {
      const specialization = 'Web开发 & Design 设计';

      const createResponse = await request(app.getHttpServer())
        .post('/admin/instructors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Unicode',
          lastName: 'Test',
          email: `unicode.${Date.now()}@example.com`,
          password: 'password123',
          specialization,
        });

      expect(createResponse.body.specialization).toBe(specialization);

      // Clean up
      await connection
        .collection('users')
        .deleteOne({ _id: createResponse.body._id });
    });
  });
});
