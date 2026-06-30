import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  IRoutingProvider,
  RouteCoordinates,
  RouteResult,
} from '../interfaces/routing-provider.interface';
import * as fs from 'fs';
import * as path from 'path';

interface CheckpointNode {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

interface CheckpointEdge {
  id: string;
  startNodeId: string;
  endNodeId: string;
  length: number; // Khoảng cách (km)
  geometry: [number, number][]; // [[lat1, lng1], [lat2, lng2], ...]
}

interface CheckpointGraph {
  provinceId: number;
  provinceName: string;
  nodes: CheckpointNode[];
  edges: CheckpointEdge[];
}

// 1. Thuật toán Ray-Casting kiểm tra xem tọa độ có nằm trong đa giác ngập lụt hay không
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [x, y] = point; // x = lat, y = lng
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// 2. Thuật toán kiểm tra 2 đoạn thẳng AB và CD có giao cắt nhau hay không
export function isSegmentIntersecting(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const ccw = (
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
  ) => {
    return (
      (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0])
    );
  };
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

// 3. Phân tích vùng ngập GeoJSON thành mảng tọa độ [lat, lng]
export function getPolygonLatLns(feature: any): [number, number][] {
  let coords: any = null;
  if (feature.geometry && feature.geometry.type === 'Polygon') {
    coords = feature.geometry.coordinates[0];
  } else if (feature.type === 'Polygon' && feature.coordinates) {
    coords = feature.coordinates[0];
  } else if (Array.isArray(feature) && Array.isArray(feature[0])) {
    if (feature[0].length === 2 && typeof feature[0][0] === 'number') {
      return feature.map((pt: any) => [pt[1], pt[0]] as [number, number]);
    }
    coords = feature[0];
  }

  if (!coords || !Array.isArray(coords)) return [];
  // Chuyển đổi định dạng GeoJSON [longitude, latitude] sang Leaflet [latitude, longitude]
  return coords.map((pt: any) => [pt[1], pt[0]] as [number, number]);
}

// 4. Kiểm tra xem tuyến đường (Edge) có bị chặn bởi vùng ngập hay không
export function isEdgeBlocked(
  edgeGeometry: [number, number][],
  polygonPoints: [number, number][],
): boolean {
  if (polygonPoints.length === 0) return false;

  // TH1: Kiểm tra xem các điểm nối của Edge có nằm trong đa giác ngập lụt hay không
  for (const pt of edgeGeometry) {
    if (isPointInPolygon(pt, polygonPoints)) {
      return true;
    }
  }

  // TH2: Kiểm tra xem có đoạn thẳng nào của Edge giao cắt với biên của đa giác ngập lụt hay không
  for (let i = 0; i < edgeGeometry.length - 1; i++) {
    const a = edgeGeometry[i];
    const b = edgeGeometry[i + 1];

    for (let j = 0; j < polygonPoints.length - 1; j++) {
      const c = polygonPoints[j];
      const d = polygonPoints[j + 1];

      if (isSegmentIntersecting(a, b, c, d)) {
        return true;
      }
    }
  }

  return false;
}

@Injectable()
export class DijkstraRoutingProvider implements IRoutingProvider {
  private readonly logger = new Logger(DijkstraRoutingProvider.name);
  private graph: CheckpointGraph | null = null;

  constructor() {
    this.loadGraph();
  }

  private loadGraph(coords?: RouteCoordinates) {
    try {
      // HCMC center latitude is ~10.77. If coords.latitude < 13.0, load ho-chi-minh-checkpoints.json
      // Otherwise load da-nang-checkpoints.json
      const isHCMC = coords ? coords.latitude < 13.0 : true;
      const fileName = isHCMC
        ? 'ho-chi-minh-checkpoints.json'
        : 'da-nang-checkpoints.json';
      const filePath = path.join(__dirname, `../assets/${fileName}`);

      const fileData = fs.readFileSync(filePath, 'utf-8');
      this.graph = JSON.parse(fileData);
      this.logger.log(
        `Loaded checkpoint graph for ${this.graph?.provinceName} with ${this.graph?.nodes.length} nodes`,
      );
    } catch (err) {
      this.logger.error('Failed to load checkpoint graph file:', err);
    }
  }

  // Hàm "hút" (Snap) tọa độ tự do về Node gần nhất trong đồ thị
  private findClosestNode(coords: RouteCoordinates): CheckpointNode {
    if (!this.graph || this.graph.nodes.length === 0) {
      throw new BadRequestException(
        'Đồ thị mạng lưới chốt giao thông chưa được khởi tạo.',
      );
    }

    let closestNode = this.graph.nodes[0];
    let minDistance = Infinity;

    this.graph.nodes.forEach((node) => {
      // Tính khoảng cách Euclidean đơn giản để tìm node gần nhất
      const dLat = node.lat - coords.latitude;
      const dLng = node.lng - coords.longitude;
      const distance = dLat * dLat + dLng * dLng;

      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    });

    return closestNode;
  }

  async calculateRoute(
    start: RouteCoordinates,
    end: RouteCoordinates,
    avoidPolygons?: any[],
    profile: 'car' | 'foot' | 'boat' = 'car',
  ): Promise<RouteResult> {
    // Tự động nạp đúng bản đồ dựa trên tọa độ điểm đi (Hồ Chí Minh vs Đà Nẵng)
    this.loadGraph(start);
    if (!this.graph) {
      throw new BadRequestException(
        'Không thể tải dữ liệu mạng lưới đường bộ chốt giao thông.',
      );
    }

    // 1. Phân tích các vùng ngập thành đa giác lat-lng
    const blockedPolygons = (avoidPolygons || [])
      .map((poly) => getPolygonLatLns(poly))
      .filter((p) => p.length > 0);

    // 2. Lọc bỏ các Edge bị chặn bởi các vùng ngập
    const activeEdges = this.graph.edges.filter((edge) => {
      // Nếu có bất cứ vùng ngập nào chặn Edge này, ta loại bỏ nó khỏi đồ thị tạm thời
      for (const polygon of blockedPolygons) {
        if (isEdgeBlocked(edge.geometry, polygon)) {
          this.logger.log(
            `Edge ${edge.id} connects node ${edge.startNodeId} and ${edge.endNodeId} is BLOCKED by flood zone`,
          );
          return false;
        }
      }
      return true;
    });

    // 3. Xác định Node xuất phát và Node kết thúc (Snapping)
    const startNode = this.findClosestNode(start);
    const endNode = this.findClosestNode(end);

    this.logger.log(
      `Routing from node ${startNode.id} (${startNode.name}) to node ${endNode.id} (${endNode.name})`,
    );

    // 4. Triển khai thuật toán Dijkstra chuẩn
    const dist: Record<string, number> = {};
    const prev: Record<string, { nodeId: string; edgeId: string } | null> = {};
    const visited = new Set<string>();

    this.graph.nodes.forEach((node) => {
      dist[node.id] = Infinity;
      prev[node.id] = null;
    });

    dist[startNode.id] = 0;

    while (true) {
      // Tìm node chưa duyệt có khoảng cách ngắn nhất
      let u: string | null = null;
      let minDist = Infinity;

      this.graph.nodes.forEach((node) => {
        if (!visited.has(node.id) && dist[node.id] < minDist) {
          minDist = dist[node.id];
          u = node.id;
        }
      });

      // Nếu không tìm được node tiếp theo hoặc đích đến bị cô lập hoàn toàn
      if (u === null || minDist === Infinity) {
        break;
      }

      // Đã tìm thấy đường đi ngắn nhất đến đích
      if (u === endNode.id) {
        break;
      }

      visited.add(u);

      // Tìm các cạnh kề với node u trong danh sách cạnh đang hoạt động
      const neighbors = activeEdges.filter(
        (e) => e.startNodeId === u || e.endNodeId === u,
      );

      neighbors.forEach((edge) => {
        const v = edge.startNodeId === u ? edge.endNodeId : edge.startNodeId;
        if (visited.has(v)) return;

        const alt = dist[u!] + edge.length;
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = { nodeId: u!, edgeId: edge.id };
        }
      });
    }

    // 5. Kiểm tra kết quả tìm đường
    if (dist[endNode.id] === Infinity) {
      this.logger.warn(
        `No land route found from ${startNode.id} to ${endNode.id} due to flooding isolation`,
      );
      throw new BadRequestException(
        'Hiện trường bị cô lập hoàn toàn bằng đường bộ. Đề xuất điều hướng bằng phương tiện thủy (xuồng, ca-nô).',
      );
    }

    // 6. Tái cấu trúc tuyến đường đi
    const pathCoordinates: RouteCoordinates[] = [];
    let curr = endNode.id;
    const pathEdges: CheckpointEdge[] = [];
    const traversalDirections: ('forward' | 'backward')[] = [];

    while (prev[curr]) {
      const step = prev[curr]!;
      const edge = this.graph.edges.find((e) => e.id === step.edgeId)!;
      pathEdges.push(edge);
      // Xác định chiều di chuyển để sắp xếp tọa độ chuẩn xác
      traversalDirections.push(
        edge.startNodeId === step.nodeId ? 'forward' : 'backward',
      );
      curr = step.nodeId;
    }

    // Do truy ngược từ đích về nguồn, ta cần đảo ngược lại thứ tự để đi từ nguồn -> đích
    pathEdges.reverse();
    traversalDirections.reverse();

    for (let i = 0; i < pathEdges.length; i++) {
      const edge = pathEdges[i];
      const dir = traversalDirections[i];
      const geom = [...edge.geometry];
      if (dir === 'backward') {
        geom.reverse();
      }

      // Tránh lặp tọa độ điểm chuyển tiếp giữa các Edge liền kề
      const startIdx = i === 0 ? 0 : 1;
      for (let j = startIdx; j < geom.length; j++) {
        pathCoordinates.push({
          latitude: geom[j][0],
          longitude: geom[j][1],
        });
      }
    }

    // Tính toán khoảng cách và thời gian (giả định vận tốc trung bình 30 km/h)
    const distanceKm = dist[endNode.id];
    const durationMin = (distanceKm / 30) * 60; // km / km/h * 60 = phút

    return {
      coordinates: pathCoordinates,
      distanceKm,
      durationMin,
    };
  }
}
