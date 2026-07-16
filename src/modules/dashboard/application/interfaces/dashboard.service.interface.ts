export interface IDashboardService {
  getStats(provinceId: number | null, startDate?: Date, endDate?: Date, adminUnitId?: number): Promise<any>;
  getCharts(
    provinceId: number | null,
    days?: number,
    startDate?: Date,
    endDate?: Date,
    adminUnitId?: number,
  ): Promise<any>;
  getAlerts(provinceId: number | null, startDate?: Date, endDate?: Date, adminUnitId?: number): Promise<any>;
  getMapTasks(provinceId: number | null, startDate?: Date, endDate?: Date, adminUnitId?: number): Promise<any>;
  getResources(provinceId: number | null, startDate?: Date, endDate?: Date, adminUnitId?: number): Promise<any>;
}

