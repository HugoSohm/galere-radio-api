import { TrackMetadata } from './metadata';

/**
 * Result of a successful media download.
 */
export interface DownloadResult {
    audioUrl: string;
    coverUrl: string;
    metadata: TrackMetadata;
}
