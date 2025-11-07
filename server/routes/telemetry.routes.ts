import { Router, Request, Response } from 'express';
import {
  recordDigitalIdInteraction,
  getDigitalIdMetrics,
} from '../services/telemetry.service';

const router = Router();

router.post('/digital-id', (req: Request, res: Response) => {
  const { eventType } = req.body || {};
  if (eventType !== 'hover' && eventType !== 'modal_open') {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  recordDigitalIdInteraction(eventType);
  res.json({ success: true });
});

router.get('/digital-id', (_req: Request, res: Response) => {
  res.json(getDigitalIdMetrics());
});

export default router;
