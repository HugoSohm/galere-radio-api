/**
 * Supported media source types.
 */
export enum SourceType {
    YOUTUBE = 'youtube',
    SOUNDCLOUD = 'soundcloud',
    SPOTIFY = 'spotify',
    DEEZER = 'deezer',
    APPLE_MUSIC = 'apple_music'
}

/**
 * Metadata for a single track.
 */
export interface TrackMetadata {
    title: string;
    artists: string[];
    coverUrl: string;
    source: SourceType;
    url?: string;
}
