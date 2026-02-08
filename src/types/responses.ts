import { TrackMetadata } from './metadata';

/**
 * Result of a successful media download.
 */
export interface DownloadResult {
    audioPath: string;
    coverPath: string;
    metadata: TrackMetadata;
}
