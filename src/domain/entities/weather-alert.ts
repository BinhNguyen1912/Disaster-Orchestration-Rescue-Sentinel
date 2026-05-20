import { WeatherAlertType } from '../enums/weatherAlertType.enum';
import { WeatherSource } from '../enums/weatherSource.enum';
import { Province } from './province';
import { User } from './user';

export class WeatherAlert {
  id: number;
  provinceId: number;
  source: WeatherSource;
  alertType: WeatherAlertType;
  area?: any; // geometry;
  severityLevel: number;
  issuedAt: Date;
  expiresAt?: Date;
  rawData?: any;
  isTriggeredIot: boolean;
  triggeredBy?: number;
  province: Province;
  triggerer?: User | null;
}
