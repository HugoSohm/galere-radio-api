import { SourceType, TrackMetadata } from '../types/metadata';

/**
 * Retrieves track information from Deezer by track ID.
 */
export const getDeezerTrackInfo = async (trackId: string): Promise<TrackMetadata> => {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`);

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch Deezer track: ${error}`);
    }

    const track: any = await response.json();
    if (track.error) {
        throw new Error(`Deezer API error: ${track.error.message}`);
    }

    return {
        title: track.title,
        artists: [track.artist.name],
        coverUrl: track.album.cover_xl || track.album.cover_big || track.album.cover_medium || '',
        source: SourceType.DEEZER
    };
};
