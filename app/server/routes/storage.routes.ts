import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localStorageService } from '../services/local-storage.service';

const router = Router();

/**
 * GET /api/storage/videos/:filename
 * Serve video files from local storage
 */
router.get('/videos/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = localStorageService.getFilePath('videos', filename);

    if (!localStorageService.fileExists('videos', filename)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    // Support for video streaming with range requests
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': getContentType(filePath),
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': getContentType(filePath),
      };

      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error serving video:', error);
    res.status(500).json({ error: 'Failed to serve video' });
  }
});

/**
 * GET /api/storage/thumbnails/:filename
 * Serve thumbnail images from local storage
 */
router.get('/thumbnails/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = localStorageService.getFilePath('thumbnails', filename);

    if (!localStorageService.fileExists('thumbnails', filename)) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    res.setHeader('Content-Type', getContentType(filePath));
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = localStorageService.getStats();
    res.json({
      ...stats,
      totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
    });
  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({ error: 'Failed to get storage stats' });
  }
});

/**
 * Get content type from file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

export default router;
