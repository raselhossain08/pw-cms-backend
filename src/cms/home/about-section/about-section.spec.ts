import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AboutSectionService } from './services/about-section.service';
import { AboutSectionController } from './controllers/about-section.controller';
import { AboutSection } from './schemas/about-section.schema';
import { CloudinaryService } from '../../services/cloudinary.service';
import {
  CreateAboutSectionDto,
  UpdateAboutSectionDto,
} from './dto/about-section.dto';

describe('AboutSectionService', () => {
  let service: AboutSectionService;
  let model: Model<AboutSection>;

  const mockAboutSection = {
    _id: '65a1b2c3d4e5f6a7b8c9d0e1',
    id: 'about',
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    description: '<p>Test Description</p>',
    image: 'https://example.com/image.jpg',
    highlights: [{ icon: '🎓', label: 'Test', text: 'Test highlight' }],
    stats: [{ value: 100, suffix: '+', label: 'Test Stat' }],
    cta: { label: 'Learn More', link: '/courses' },
    seo: {
      title: 'SEO Title',
      description: 'SEO Description',
      keywords: 'test, keywords',
      ogTitle: 'OG Title',
      ogDescription: 'OG Description',
      ogImage: 'https://example.com/og.jpg',
      canonicalUrl: 'https://example.com/about',
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    findById: jest.fn(),
    new: jest.fn(),
    constructor: jest.fn(),
    create: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AboutSectionService,
        {
          provide: getModelToken(AboutSection.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<AboutSectionService>(AboutSectionService);
    model = module.get<Model<AboutSection>>(getModelToken(AboutSection.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAboutSection', () => {
    it('should return about section from database', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      const result = await service.getAboutSection();

      expect(result).toEqual(mockAboutSection);
      expect(mockModel.findOne).toHaveBeenCalledWith({ id: 'about' });
    });

    it('should return cached data on second call', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      // First call
      await service.getAboutSection();
      // Second call (should use cache)
      const result = await service.getAboutSection();

      expect(result).toEqual(mockAboutSection);
      expect(mockModel.findOne).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should return null if about section does not exist', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      const result = await service.getAboutSection();

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      const exec = jest.fn().mockRejectedValue(new Error('Database error'));
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      await expect(service.getAboutSection()).rejects.toThrow();
    });
  });

  describe('upsertAboutSection', () => {
    const createDto: CreateAboutSectionDto = {
      id: 'about',
      title: 'New Title',
      subtitle: 'New Subtitle',
      description: '<p>New Description</p>',
      image: 'https://example.com/new.jpg',
      highlights: [],
      cta: { label: 'Test', link: '/test' },
      stats: [],
      isActive: true,
    };

    it('should create or update about section', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOneAndUpdate.mockReturnValue({ exec });

      const result = await service.upsertAboutSection(createDto);

      expect(result).toEqual(mockAboutSection);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'about' },
        expect.objectContaining(createDto),
        { new: true, upsert: true, runValidators: true },
      );
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      const invalidDto = { ...createDto, title: '' };

      await expect(
        service.upsertAboutSection(invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear cache after successful upsert', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOneAndUpdate.mockReturnValue({ exec });

      await service.upsertAboutSection(createDto);

      // Verify cache is cleared by checking next call hits database
      await service.getAboutSection();
      expect(mockModel.findOne).toHaveBeenCalled();
    });
  });

  describe('updateAboutSection', () => {
    const updateDto: UpdateAboutSectionDto = {
      title: 'Updated Title',
    };

    it('should update existing about section', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOne.mockReturnValue({ exec });
      mockModel.findOneAndUpdate.mockReturnValue({ exec });

      const result = await service.updateAboutSection(updateDto);

      expect(result).toEqual(mockAboutSection);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'about' },
        { $set: updateDto },
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFoundException if about section does not exist', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ exec });

      await expect(service.updateAboutSection(updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle isActive status', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      const updatedSection = { ...mockAboutSection, isActive: false };
      mockModel.findOne.mockReturnValue({ exec });
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedSection),
      });

      const result = await service.toggleActive();

      expect(result.isActive).toBe(false);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'about' },
        { $set: { isActive: false } },
        { new: true },
      );
    });

    it('should throw NotFoundException if about section does not exist', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ exec });

      await expect(service.toggleActive()).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAboutSection', () => {
    it('should delete about section', async () => {
      const exec = jest.fn().mockResolvedValue({ deletedCount: 1 });
      mockModel.deleteOne.mockReturnValue({ exec });

      await service.deleteAboutSection();

      expect(mockModel.deleteOne).toHaveBeenCalledWith({ id: 'about' });
    });

    it('should throw NotFoundException if about section does not exist', async () => {
      const exec = jest.fn().mockResolvedValue({ deletedCount: 0 });
      mockModel.deleteOne.mockReturnValue({ exec });

      await expect(service.deleteAboutSection()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('duplicate', () => {
    it('should create a duplicate of about section', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOne.mockReturnValue({ exec });

      const mockDuplicated = {
        ...mockAboutSection,
        id: 'about-1234567890',
        title: 'Test Title (Copy)',
        isActive: false,
        save: jest.fn().mockResolvedValue(mockAboutSection),
      };

      // Mock the model constructor
      (model as any).mockImplementation(() => mockDuplicated);

      const result = await service.duplicate();

      expect(result.isActive).toBe(false);
      expect(result.title).toContain('(Copy)');
    });

    it('should throw NotFoundException if original does not exist', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({ exec });

      await expect(service.duplicate()).rejects.toThrow(NotFoundException);
    });
  });

  describe('export', () => {
    it('should export about section in JSON format', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      const result = await service.export('json');

      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('aboutSection');
      expect(result.format).toBe('json');
    });

    it('should export about section in PDF format', async () => {
      const exec = jest.fn().mockResolvedValue(mockAboutSection);
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      const result = await service.export('pdf');

      expect(typeof result).toBe('string');
    });

    it('should throw NotFoundException if about section does not exist', async () => {
      const exec = jest.fn().mockResolvedValue(null);
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      });

      await expect(service.export('json')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('AboutSectionController', () => {
  let controller: AboutSectionController;
  let service: AboutSectionService;
  let cloudinaryService: CloudinaryService;

  const mockAboutSectionService = {
    getAboutSection: jest.fn(),
    updateAboutSection: jest.fn(),
    upsertAboutSection: jest.fn(),
    toggleActive: jest.fn(),
    duplicate: jest.fn(),
    export: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AboutSectionController],
      providers: [
        {
          provide: AboutSectionService,
          useValue: mockAboutSectionService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    controller = module.get<AboutSectionController>(AboutSectionController);
    service = module.get<AboutSectionService>(AboutSectionService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAboutSection', () => {
    it('should return about section with success response', async () => {
      const mockSection = { id: 'about', title: 'Test' };
      mockAboutSectionService.getAboutSection.mockResolvedValue(mockSection);

      const result = await controller.getAboutSection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSection);
      expect(result.message).toBe('About section retrieved successfully');
    });

    it('should throw NotFoundException when section does not exist', async () => {
      mockAboutSectionService.getAboutSection.mockResolvedValue(null);

      await expect(controller.getAboutSection()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAboutSection', () => {
    const updateDto: UpdateAboutSectionDto = { title: 'Updated' };

    it('should update about section successfully', async () => {
      const mockUpdated = { id: 'about', title: 'Updated' };
      mockAboutSectionService.updateAboutSection.mockResolvedValue(mockUpdated);

      const result = await controller.updateAboutSection(updateDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdated);
      expect(service.updateAboutSection).toHaveBeenCalledWith(updateDto);
    });

    it('should throw BadRequestException for empty update', async () => {
      await expect(controller.updateAboutSection({})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle active status successfully', async () => {
      const mockToggled = { id: 'about', isActive: false };
      mockAboutSectionService.toggleActive.mockResolvedValue(mockToggled);

      const result = await controller.toggleActive();

      expect(result.success).toBe(true);
      expect(result.data.isActive).toBe(false);
      expect(result.message).toContain('deactivated');
    });
  });

  describe('uploadMedia', () => {
    it('should upload image and update about section', async () => {
      const mockFiles = {
        image: [
          { buffer: Buffer.from('test'), mimetype: 'image/jpeg', size: 1024 },
        ],
      };
      const mockBody = {
        title: 'Test',
        subtitle: 'Test',
        description: 'Test',
      };
      const mockUploaded = {
        id: 'about',
        image: 'https://cloudinary.com/image.jpg',
      };

      mockCloudinaryService.uploadImage.mockResolvedValue({
        url: 'https://cloudinary.com/image.jpg',
      });
      mockAboutSectionService.upsertAboutSection.mockResolvedValue(
        mockUploaded,
      );

      const result = await controller.uploadMedia(mockFiles as any, mockBody);

      expect(result.success).toBe(true);
      expect(result.data.image).toBe('https://cloudinary.com/image.jpg');
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
    });

    it('should throw BadRequestException for file size too large', async () => {
      const mockFiles = {
        image: [{ size: 11 * 1024 * 1024, mimetype: 'image/jpeg' }],
      };
      const mockBody = { title: 'Test', subtitle: 'Test', description: 'Test' };

      await expect(
        controller.uploadMedia(mockFiles as any, mockBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const mockFiles = {
        image: [{ size: 1024, mimetype: 'application/pdf' }],
      };
      const mockBody = { title: 'Test', subtitle: 'Test', description: 'Test' };

      await expect(
        controller.uploadMedia(mockFiles as any, mockBody),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('duplicate', () => {
    it('should duplicate about section successfully', async () => {
      const mockDuplicated = { id: 'about-123', title: 'Test (Copy)' };
      mockAboutSectionService.duplicate.mockResolvedValue(mockDuplicated);

      const result = await controller.duplicate();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDuplicated);
      expect(result.message).toContain('duplicated successfully');
    });
  });

  describe('export', () => {
    it('should export about section as JSON', async () => {
      const mockExport = {
        exportedAt: new Date().toISOString(),
        aboutSection: {},
      };
      mockAboutSectionService.export.mockResolvedValue(mockExport);

      const mockRes = {
        setHeader: jest.fn(),
        json: jest.fn(),
      };

      await controller.export('json', mockRes as any);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json',
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid format', async () => {
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.export('invalid' as any, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

