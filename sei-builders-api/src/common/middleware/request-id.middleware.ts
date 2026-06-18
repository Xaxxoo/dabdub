import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_NAMES } from '../constants/app.constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers[HEADER_NAMES.REQUEST_ID] as string) ?? uuidv4();

    req.headers[HEADER_NAMES.REQUEST_ID] = requestId;
    res.setHeader(HEADER_NAMES.REQUEST_ID, requestId);

    next();
  }
}
