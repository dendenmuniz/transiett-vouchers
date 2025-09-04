import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

import { createError, errorHandler } from './middlewares/errorHandler';


dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());


app.get('/api', (req, res) => {
  res.send('API is healthy!');
});


app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next(createError('Route not found', 404));
});

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
