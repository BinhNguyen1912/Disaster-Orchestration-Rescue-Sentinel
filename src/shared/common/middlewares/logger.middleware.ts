import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;
    const startTime = Date.now();
    const requestBody = request.body || {};

    response.on('finish', () => {
      const { statusCode } = response;
      const executionTime = Date.now() - startTime;

      const logData = {
        method,
        url: originalUrl,
        statusCode,
        duration: `${executionTime}ms`,
        body: requestBody,
      };

      if (statusCode >= 500) {
        this.logger.error(`[FAILED] ${JSON.stringify(logData)}`);
      } else if (statusCode >= 400) {
        this.logger.warn(`[FAILED] ${JSON.stringify(logData)}`);
      } else {
        this.logger.log(`[SUCCESS] ${JSON.stringify(logData)}`);
      }
    });

    next();
  }
}
