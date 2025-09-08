import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import zlib from 'zlib';

import { router } from '../routes';
import { createError, errorHandler } from '../middlewares/ErrorHandler';

export function buildApp(deps?: any) {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(
    compression({
      threshold: 0,
      level: zlib.constants.Z_BEST_SPEED,
    })
  );

  
  app.use((req, _res, next) => {
    // @ts-ignore
    req.deps = deps || {};
    next();
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', router);


  app.use((req, _res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next(createError('Route not found', 404));
  });


  app.use(errorHandler);

  return app;
}
