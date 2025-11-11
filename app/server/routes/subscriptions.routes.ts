import { Router, Request, Response } from 'express';
import { db } from '../database/db-factory';

const router = Router();

function extractWallet(req: Request): string | null {
  const headerWallet = req.headers['x-wallet-address'];
  if (typeof headerWallet === 'string' && headerWallet.trim().length > 0) {
    return headerWallet.trim();
  }
  return null;
}

async function buildSummary(creatorWallet: string, viewerWallet?: string | null) {
  const subscriberCount = await db.getSubscriberCount(creatorWallet);
  const isSubscribed =
    !!viewerWallet && creatorWallet
      ? await db.isSubscribed(viewerWallet, creatorWallet)
      : false;
  return { subscriberCount, isSubscribed };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const subscriberWallet = extractWallet(req);
    if (!subscriberWallet) {
      return res.status(401).json({
        error: 'Wallet required',
        message: 'Please provide x-wallet-address header',
      });
    }

    const subscriptions = await db.getSubscriptionsBySubscriber(subscriberWallet);
    res.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const subscriberWallet = extractWallet(req);
    const { creatorWallet } = req.body || {};

    if (!subscriberWallet) {
      return res.status(401).json({
        error: 'Wallet required',
        message: 'Please provide x-wallet-address header',
      });
    }

    if (!creatorWallet || typeof creatorWallet !== 'string') {
      return res.status(400).json({ error: 'creatorWallet is required' });
    }

    if (creatorWallet === subscriberWallet) {
      return res.status(400).json({
        error: 'Cannot subscribe to yourself',
      });
    }

    // Ensure creator exists
    const creator = await db.getUserByWallet(creatorWallet);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    await db.createSubscription(subscriberWallet, creatorWallet);

    const summary = await buildSummary(creatorWallet, subscriberWallet);

    res.json({
      success: true,
      status: 'subscribed',
      ...summary,
    });
  } catch (error: any) {
    console.error('Error subscribing to creator:', error);
    res.status(500).json({
      error: 'Failed to subscribe',
      message: error.message || 'Unexpected error',
    });
  }
});

router.delete('/:creatorWallet', async (req: Request, res: Response) => {
  try {
    const subscriberWallet = extractWallet(req);
    const { creatorWallet } = req.params;

    if (!subscriberWallet) {
      return res.status(401).json({
        error: 'Wallet required',
        message: 'Please provide x-wallet-address header',
      });
    }

    if (!creatorWallet) {
      return res.status(400).json({ error: 'creatorWallet is required' });
    }

    await db.deleteSubscription(subscriberWallet, creatorWallet);
    const summary = await buildSummary(creatorWallet, subscriberWallet);

    res.json({
      success: true,
      status: 'unsubscribed',
      ...summary,
    });
  } catch (error) {
    console.error('Error unsubscribing from creator:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

router.get('/:creatorWallet/summary', async (req: Request, res: Response) => {
  try {
    const viewerWallet = extractWallet(req);
    const { creatorWallet } = req.params;

    if (!creatorWallet) {
      return res.status(400).json({ error: 'creatorWallet is required' });
    }

    const summary = await buildSummary(creatorWallet, viewerWallet);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching subscription summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
