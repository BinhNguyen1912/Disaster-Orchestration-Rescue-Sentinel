export interface RouteCoordinates {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: RouteCoordinates[]; // Danh sách lat-lng nối tiếp để vẽ polyline
  distanceKm: number; // Khoảng cách thực tế (km)
  durationMin: number; // Thời gian di chuyển dự kiến (phút)
}

export interface IRoutingProvider {
  /**
   * Tính toán tuyến đường đi từ điểm xuất phát đến điểm kết thúc, tránh các vùng ngập
   * @param start Tọa độ điểm đi (Đội cứu hộ)
   * @param end Tọa độ điểm đến (SOS)
   * @param avoidPolygons Danh sách tọa độ các đa giác vùng ngập lụt (Polygon GeoJSON)
   * @param profile Phương tiện di chuyển (car | foot | boat)
   */
  calculateRoute(
    start: RouteCoordinates,
    end: RouteCoordinates,
    avoidPolygons?: any[],
    profile?: 'car' | 'foot' | 'boat',
  ): Promise<RouteResult>;
}
