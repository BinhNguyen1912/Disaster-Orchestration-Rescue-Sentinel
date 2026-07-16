import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SystemNotificationEntity,
  NotificationEventEntity,
  NotificationTemplateGroupEntity,
  NotificationTemplateEntity,
  NotificationRecipientEntity,
  UserEntity,
} from '@infrastructure/database/entities';
import { NotificationService } from './notification.service';
import { TemplateEngine } from './template-engine';

describe('Notification Module Tests', () => {
  describe('TemplateEngine', () => {
    it('should render variables correctly (Happy Case)', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const result = TemplateEngine.render(template, { name: 'An', place: 'Da Nang' });
      expect(result).toBe('Hello An, welcome to Da Nang!');
    });

    it('should ignore whitespaces inside double curly braces (Edge Case)', () => {
      const template = 'Hello {{ name }}, welcome to {{  place  }}!';
      const result = TemplateEngine.render(template, { name: 'An', place: 'Da Nang' });
      expect(result).toBe('Hello An, welcome to Da Nang!');
    });

    it('should leave unprovided variables intact in the template (Edge Case)', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const result = TemplateEngine.render(template, { name: 'An' });
      expect(result).toBe('Hello An, welcome to {{place}}!');
    });

    it('should return empty string if template is empty or null (Edge Case)', () => {
      expect(TemplateEngine.render('', {})).toBe('');
      expect(TemplateEngine.render(null as any, {})).toBe('');
    });
  });

  describe('NotificationService', () => {
    let service: NotificationService;
    let eventEmitter: EventEmitter2;

    const mockNotifRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
      update: jest.fn(),
    };

    const mockEventRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
      find: jest.fn(),
      manager: {},
    };

    const mockTemplateRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
    };

    const mockRecipientRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    const mockUserRepo = {
      createQueryBuilder: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: getRepositoryToken(SystemNotificationEntity), useValue: mockNotifRepo },
          { provide: getRepositoryToken(NotificationEventEntity), useValue: mockEventRepo },
          { provide: getRepositoryToken(NotificationTemplateEntity), useValue: mockTemplateRepo },
          { provide: getRepositoryToken(NotificationRecipientEntity), useValue: mockRecipientRepo },
          { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<NotificationService>(NotificationService);
      eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully seed initial data on module init if not exists (Happy Case)', async () => {
      mockEventRepo.findOne.mockResolvedValue(null);
      mockTemplateRepo.findOne.mockResolvedValue(null);

      const mockGroupRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(data => data),
        save: jest.fn(data => Promise.resolve(data)),
        find: jest.fn().mockResolvedValue([{ id: 1, code: 'SOS' }]),
      };

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue(mockGroupRepo),
      };

      mockEventRepo.manager = mockEntityManager as any;
      mockEventRepo.find.mockResolvedValue([
        { id: 1, code: 'SOS_CREATED' },
        { id: 2, code: 'SOS_UPDATED' },
        { id: 3, code: 'TEAM_ASSIGNED' },
        { id: 4, code: 'TEAM_ARRIVED' },
        { id: 5, code: 'TEAM_FINISHED' },
        { id: 6, code: 'FLOOD_CREATED' },
        { id: 7, code: 'FLOOD_VERIFIED' },
        { id: 8, code: 'FLOOD_REJECTED' },
        { id: 9, code: 'SYSTEM_NOTICE' },
      ]);

      await service.onModuleInit();

      expect(mockEventRepo.save).toHaveBeenCalled();
      expect(mockGroupRepo.save).toHaveBeenCalled();
      expect(mockTemplateRepo.save).toHaveBeenCalled();
    });

    it('should throw an error if the event code is not found or inactive (Edge Case)', async () => {
      mockEventRepo.findOne.mockResolvedValue(null);

      await expect(
        service.send({ event: 'INVALID_EVENT', data: {} }),
      ).rejects.toThrow('Event INVALID_EVENT is not registered or inactive.');
    });

    it('should throw an error if no template is found for the event (Edge Case)', async () => {
      mockEventRepo.findOne.mockResolvedValue({ id: 1, code: 'SOS_CREATED', isActive: true });
      mockTemplateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.send({ event: 'SOS_CREATED', data: {} }),
      ).rejects.toThrow('No template found for event SOS_CREATED');
    });

    it('should prioritize province-specific template when provinceId is provided (Happy Case)', async () => {
      mockEventRepo.findOne.mockResolvedValue({ id: 1, code: 'SOS_CREATED', isActive: true });
      
      mockTemplateRepo.findOne
        .mockResolvedValueOnce({
          id: 99,
          eventId: 1,
          code: 'PROVINCE_SPECIFIC_TEMPLATE',
          titleTemplate: 'Specific Province SOS',
          contentTemplate: 'Help {{citizenName}}',
          defaultPriority: 'CRITICAL',
          defaultChannels: ['APP'],
          isDefault: false,
          isActive: true,
        });

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 10 }]),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.send({
        event: 'SOS_CREATED',
        provinceId: 2,
        data: { citizenName: 'An' },
      });

      expect(result.title).toBe('Specific Province SOS');
      expect(result.content).toBe('Help An');
      expect(mockTemplateRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ provinceId: 2 }) }),
      );
    });

    it('should fallback to default template if province specific template is not found (Happy Case)', async () => {
      mockEventRepo.findOne.mockResolvedValue({ id: 1, code: 'SOS_CREATED', isActive: true });
      
      mockTemplateRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 100,
          eventId: 1,
          code: 'DEFAULT_TEMPLATE',
          titleTemplate: 'Default SOS Alert',
          contentTemplate: 'Urgent: {{citizenName}}',
          defaultPriority: 'HIGH',
          defaultChannels: ['APP'],
          isDefault: true,
          isActive: true,
        });

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.send({
        event: 'SOS_CREATED',
        provinceId: 2,
        data: { citizenName: 'An' },
      });

      expect(result.title).toBe('Default SOS Alert');
      expect(result.content).toBe('Urgent: An');
      expect(result.status).toBe('SENT');
    });

    it('should successfully dispatch event to emitter when recipients exist (Happy Case)', async () => {
      mockEventRepo.findOne.mockResolvedValue({ id: 1, code: 'SOS_CREATED', isActive: true });
      mockTemplateRepo.findOne.mockResolvedValue({
        id: 100,
        eventId: 1,
        code: 'DEFAULT_TEMPLATE',
        titleTemplate: 'Default SOS Alert',
        contentTemplate: 'Urgent: {{citizenName}}',
        defaultPriority: 'HIGH',
        defaultChannels: ['APP', 'EMAIL'],
        isDefault: true,
        isActive: true,
      });

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.send({
        event: 'SOS_CREATED',
        data: { citizenName: 'An' },
      });

      expect(result.status).toBe('PROCESSING');
      expect(mockRecipientRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledTimes(4);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.dispatch',
        expect.objectContaining({
          userId: 10,
          channel: 'APP',
          title: 'Default SOS Alert',
        }),
      );
    });
  });
});
