export interface IDashboardService {
  getStats(provinceId: number | null): Promise<any>;
  getCharts(provinceId: number | null, days: number): Promise<any>;
  getAlerts(provinceId: number | null): Promise<any>;
  getMapTasks(provinceId: number | null): Promise<any>;
  getResources(provinceId: number | null): Promise<any>;
}
