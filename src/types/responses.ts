import { TrackMetadata } from './metadata';

/**
 * Result of a successful media download.
 */
export interface DownloadResult {
    mp3Path: string;
    coverPath: string;
    metadata: TrackMetadata;
}
