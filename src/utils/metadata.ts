import { parseFile } from 'music-metadata';
import path from 'path';
import { SourceType } from '../types/metadata';

/**
 * Identifies the source type from a given URL.
 */
export const getSourceFromUrl = (url: string): SourceType | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return SourceType.YOUTUBE;
    if (url.includes('soundcloud.com')) return SourceType.SOUNDCLOUD;
    if (url.includes('spotify.com')) return SourceType.SPOTIFY;
    if (url.includes('deezer.com') || url.includes('deezer.page.link')) return SourceType.DEEZER;
    if (url.includes('music.apple.com')) return SourceType.APPLE_MUSIC;
    return null;
};

/**
 * Parses artist and title information from a raw title string.
 */
export const parseArtistsTitle = (fullTitle: string, uploaderName: string): { title: string, artists: string[] } => {
    let title = fullTitle;
    let artists: string[] = [uploaderName];

    const separatorRegex = / - /;
    if (separatorRegex.test(title)) {
        const parts = title.split(separatorRegex);
        if (parts.length >= 2) {
            // Assuming "Artist - Title"
            artists = [parts[0].trim()];
            title = parts.slice(1).join(" - ").trim();
        }
    }

    title = title.replace(/\([^)]*Official[^)]*\)/gi, '')
        .replace(/\([^)]*Video[^)]*\)/gi, '')
        .replace(/\(^\)/g, '').trim();

    return { title, artists };
};

/**
 * Gets full audio info from ID3 tags (id, title, artists).
 */
export interface AudioInfo {
    id: string;
    title: string;
    artists: string[];
}

export const getAudioInfo = async (filePath: string): Promise<AudioInfo> => {
    try {
        const metadata = await parseFile(filePath);
        const { title, artists, artist } = metadata.common;

        const finalTitle = title || path.parse(filePath).name;
        const finalArtists = (artists && artists.length > 0) ? artists : (artist ? [artist] : []);
        const artistsStr = finalArtists.join(', ');

        let id = path.parse(filePath).name;
        if (title && artistsStr) {
            id = `${title}-${artistsStr}`;
        } else if (title) {
            id = title;
        } else if (artistsStr) {
            id = artistsStr;
        }

        return { id, title: finalTitle, artists: finalArtists };
    } catch (error) {
        const name = path.parse(filePath).name;
        return { id: name, title: name, artists: [] };
    }
};
