import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { downloadMedia } from './downloader';
import logger from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

export const downloadQueue = new Queue('downloads', { connection });

/**
 * Initializes the worker process for the download queue.
 */
export const setupWorker = () => {
    const worker = new Worker('downloads', async (job: Job) => {
        const { url, cookies, overrides, playlists } = job.data;

        await job.updateProgress(10);
        logger.info({ module: 'Queue', jobId: job.id, url }, `Processing job`);

        try {
            const result = await downloadMedia(url, cookies, overrides, playlists);
            await job.updateProgress(100);
            return result;
        } catch (error: any) {
            logger.error({ module: 'Queue', jobId: job.id, err: error }, `Job failed`);
            throw error;
        }
    }, { connection, concurrency: 2 });

    worker.on('completed', job => {
        logger.info({ module: 'Queue', jobId: job.id }, `Job completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error({ module: 'Queue', jobId: job?.id, err }, `Job failed with error: ${err.message}`);
    });

    return worker;
};
