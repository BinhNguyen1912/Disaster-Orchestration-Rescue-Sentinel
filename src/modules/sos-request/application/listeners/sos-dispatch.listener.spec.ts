import { Test, TestingModule } from '@nestjs/testing';
import { SosDispatchListener } from './sos-dispatch.listener';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { DispatchOrchestratorService } from '../services/dispatch-orchestrator.service';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';

describe('SosDispatchListener', () => {
  let listener: SosDispatchListener;

  const mockSosRepo = {
    findById: jest.fn(),
  };

  const mockDispatchStrategy = {
    assignTeam: jest.fn(),
  };

  const mockDispatchOrchestrator = {
    dispatch: jest.fn(),
  };

  const mockDispatchSocketService = {
    broadcastSosOffer: jest.fn(),
    broadcastSosOfferClaimed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SosDispatchListener,
        { provide: 'ISosRequestRepository', useValue: mockSosRepo },
        { provide: 'IDispatchStrategy', useValue: mockDispatchStrategy },
        {
          provide: DispatchOrchestratorService,
          useValue: mockDispatchOrchestrator,
        },
        { provide: DispatchSocketService, useValue: mockDispatchSocketService },
      ],
    }).compile();

    listener = module.get<SosDispatchListener>(SosDispatchListener);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleSosCreatedEvent', () => {
    it('should exit early if SOS request not found', async () => {
      mockSosRepo.findById.mockResolvedValue(null);

      await listener.handleSosCreatedEvent({ sosId: 999 });

      expect(mockSosRepo.findById).toHaveBeenCalledWith(999);
      expect(mockDispatchStrategy.assignTeam).not.toHaveBeenCalled();
    });

    it('should run direct orchestrator dispatch if no candidates are found', async () => {
      const mockSos = { id: 10, status: SosStatus.PENDING };
      mockSosRepo.findById.mockResolvedValue(mockSos);
      mockDispatchStrategy.assignTeam.mockResolvedValue(null);

      await listener.handleSosCreatedEvent({ sosId: 10 });

      expect(mockDispatchStrategy.assignTeam).toHaveBeenCalledWith(mockSos);
      expect(mockDispatchOrchestrator.dispatch).toHaveBeenCalledWith(mockSos);
      expect(
        mockDispatchSocketService.broadcastSosOffer,
      ).not.toHaveBeenCalled();
    });

    it('should broadcast offer to top 3 candidates and setup timeout', async () => {
      jest.useFakeTimers();

      const mockSos = {
        id: 12,
        status: SosStatus.PENDING,
        severity: 'HIGH',
        requestType: 'FLOOD',
        description: 'Ngập sâu',
        location: { coordinates: [106.7, 10.7] },
      };

      const strategyResult = {
        rankedCandidates: [
          { teamId: 1, score: 0.9 },
          { teamId: 2, score: 0.8 },
          { teamId: 3, score: 0.7 },
          { teamId: 4, score: 0.6 },
        ],
      };

      mockSosRepo.findById.mockResolvedValue(mockSos);
      mockDispatchStrategy.assignTeam.mockResolvedValue(strategyResult);

      await listener.handleSosCreatedEvent({ sosId: 12 });

      // Check broadcastSosOffer calls
      expect(mockDispatchSocketService.broadcastSosOffer).toHaveBeenCalledTimes(
        3,
      );
      expect(mockDispatchSocketService.broadcastSosOffer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ sosId: 12 }),
      );
      expect(mockDispatchSocketService.broadcastSosOffer).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ sosId: 12 }),
      );
      expect(mockDispatchSocketService.broadcastSosOffer).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ sosId: 12 }),
      );

      // Mock findById for the timeout check - still pending
      const currentSosMock = { ...mockSos, assignedTeamId: null };
      mockSosRepo.findById.mockResolvedValue(currentSosMock);

      // Fast forward time by 30 seconds
      jest.advanceTimersByTime(30000);

      // Flush microtask queue
      await Promise.resolve();
      await Promise.resolve();

      expect(mockDispatchOrchestrator.dispatch).toHaveBeenCalledWith(
        currentSosMock,
      );

      jest.useRealTimers();
    });

    it('should NOT run force assignment if SOS request has already been assigned during the 30s window', async () => {
      jest.useFakeTimers();

      const mockSos = {
        id: 12,
        status: SosStatus.PENDING,
        severity: 'HIGH',
        requestType: 'FLOOD',
        location: { coordinates: [106.7, 10.7] },
      };

      const strategyResult = {
        rankedCandidates: [{ teamId: 1, score: 0.9 }],
      };

      mockSosRepo.findById.mockResolvedValue(mockSos);
      mockDispatchStrategy.assignTeam.mockResolvedValue(strategyResult);

      await listener.handleSosCreatedEvent({ sosId: 12 });

      // Mock findById for timeout check: now status is DISPATCHED and assignedTeamId is 1
      const currentSosMock = {
        ...mockSos,
        status: SosStatus.DISPATCHED,
        assignedTeamId: 1,
      };
      mockSosRepo.findById.mockResolvedValue(currentSosMock);

      jest.advanceTimersByTime(30000);

      expect(mockDispatchOrchestrator.dispatch).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
