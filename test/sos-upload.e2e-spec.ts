import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { StorageService } from '../src/infrastructure/storage/storage.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProvinceEntity } from '../src/infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '../src/infrastructure/database/entities/administrative-unit.entity';

describe('SOS Upload Flow (e2e)', () => {
  let app: INestApplication<App>;
  let mockProvinceId = 1;
  let mockAdminUnitId = 1;

  // Mock StorageService so E2E tests don't require internet or real R2 credentials
  const mockStorageService = {
    uploadFile: jest.fn().mockResolvedValue('https://pub-mock.r2.dev/sos/mock-uploaded-file.jpg'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Dynamically fetch or seed a mock province and administrative unit to avoid FK errors in DB
    try {
      const provRepo = moduleFixture.get(getRepositoryToken(ProvinceEntity));
      const adminRepo = moduleFixture.get(getRepositoryToken(AdministrativeUnitEntity));

      const provinces = await provRepo.find({ take: 1 });
      if (provinces.length > 0) {
        mockProvinceId = provinces[0].id;
        const units = await adminRepo.find({ where: { provinceId: mockProvinceId }, take: 1 });
        if (units.length > 0) {
          mockAdminUnitId = units[0].id;
        }
      }
    } catch (err) {
      console.log('Skipping seed fetch since DB is not running or empty');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should upload an image first, then submit a guest SOS request using the uploaded image URL', async () => {
    // Step 1: Upload a file (simulated image upload)
    const uploadRes = await request(app.getHttpServer())
      .post('/upload/single')
      .query({ folder: 'sos' })
      .attach('file', Buffer.from('fake-image-binary-data'), 'test-image.png')
      .expect(201);

    expect(uploadRes.body).toHaveProperty('url');
    const imageUrl = uploadRes.body.url;
    expect(imageUrl).toBe('https://pub-mock.r2.dev/sos/mock-uploaded-file.jpg');

    // Step 2: Use the returned URL to submit a guest SOS request
    const sosPayload = {
      requesterName: 'Khách Vãng Lai',
      requesterPhone: '0900123456',
      requestType: 'FLOOD',
      latitude: 10.7589,
      longitude: 106.7004,
      severity: 'HIGH',
      provinceId: mockProvinceId,
      adminUnitId: mockAdminUnitId,
      trappedPeopleCount: 2,
      specialNeedsTags: ['CHILDREN'],
      imageUrls: [imageUrl], // Linked image URL from Step 1
      description: 'Nước đang lên ngập đến đầu gối',
    };

    const sosRes = await request(app.getHttpServer())
      .post('/api/v1/sos-requests')
      .send(sosPayload)
      .expect(201);

    expect(sosRes.body).toHaveProperty('id');
    expect(sosRes.body.requesterName).toBe(sosPayload.requesterName);
    expect(sosRes.body.imageUrls).toContain(imageUrl);
  });
});
