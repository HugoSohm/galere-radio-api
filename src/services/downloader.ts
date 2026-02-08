import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile, spawn } from 'child_process';
import { Readable, PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import scdl from 'soundcloud-downloader';
import pRetry from 'p-retry';

import { sanitizeFilename } from '../utils/string';
import { parseArtistsTitle, getSourceFromUrl } from '../utils/metadata';
import { validateCookies, writeCookiesFile } from '../utils/cookies';
import { SourceType, TrackMetadata } from '../types/metadata';
import { DownloadResult } from '../types/responses';

import { downloadImage } from './image';
import { getSpotifyTrackInfo, searchSpotifyTrack } from './spotify';
import { getDeezerTrackInfo } from './deezer';
import { executeYtDlp, YTDLP_PATH, FFMPEG_STATIC_PATH } from './yt-dlp';

const execFileAsync = promisify(execFile);

if (FFMPEG_STATIC_PATH) {
    ffmpeg.setFfmpegPath(FFMPEG_STATIC_PATH);
}

const MP3_DIR = path.resolve(process.env.MP3_DOWNLOAD_DIR ?? 'mp3');
const COVER_DIR = path.resolve(process.env.COVER_DOWNLOAD_DIR ?? 'cover');

if (!fs.existsSync(MP3_DIR)) fs.mkdirSync(MP3_DIR, { recursive: true });
if (!fs.existsSync(COVER_DIR)) fs.mkdirSync(COVER_DIR, { recursive: true });

/**
 * Searches for tracks using yt-dlp.
 */
export const searchTracks = async (artist?: string, title?: string, limit: number = 5, cookies?: any[]): Promise<TrackMetadata[]> => {
    const query = [artist, title].filter(Boolean).join(' ');
    const searchUrl = `ytsearch${limit}:${query}`;
    console.log(`[Search] Searching for: ${query}`);
    const args = ['--flat-playlist', '--dump-json'];

    let cookieFile: string | null = null;
    if (cookies && cookies.length > 0 && validateCookies(cookies)) {
        cookieFile = writeCookiesFile(cookies);
        args.push('--cookies', cookieFile);
    }

    try {
        const { stdout } = await execFileAsync(YTDLP_PATH, [...args, searchUrl], { timeout: 30000 });
        const results = stdout.trim() === '' ? [] : stdout.trim().split('\n').map(line => JSON.parse(line));

        return results.map(res => {
            const { title, artists } = parseArtistsTitle(res.title || 'Unknown Title', res.uploader || 'Unknown Artist');

            let coverUrl = res.thumbnail || '';
            if (!coverUrl && Array.isArray(res.thumbnails) && res.thumbnails.length > 0) {
                coverUrl = res.thumbnails[res.thumbnails.length - 1].url || '';
            }

            if (!coverUrl && res.id) {
                coverUrl = `https://i.ytimg.com/vi/${res.id}/mqdefault.jpg`;
            }

            return {
                title,
                artists,
                coverUrl,
                url: `https://www.youtube.com/watch?v=${res.id}`,
                source: SourceType.YOUTUBE
            };
        });
    } finally {
        if (cookieFile && fs.existsSync(cookieFile)) {
            try { fs.unlinkSync(cookieFile); } catch (e) { }
        }
    }
};

/**
 * Extracts playlist information using yt-dlp.
 */
export const getPlaylistInfo = async (url: string, cookies?: any[]): Promise<TrackMetadata[]> => {
    console.log(`[Playlist] Extracting info for: ${url}`);
    const args = ['--flat-playlist', '--dump-json'];

    let cookieFile: string | null = null;
    if (cookies && cookies.length > 0 && validateCookies(cookies)) {
        cookieFile = writeCookiesFile(cookies);
        args.push('--cookies', cookieFile);
    }

    try {
        const { stdout } = await execFileAsync(YTDLP_PATH, [...args, url], { timeout: 60000 });
        const results = stdout.trim() === '' ? [] : stdout.trim().split('\n').map(line => {
            try { return JSON.parse(line); } catch (e) { return null; }
        }).filter(Boolean);

        return results.map(res => {
            const { title, artists } = parseArtistsTitle(res.title || 'Unknown Title', res.uploader || 'Unknown Artist');
            let coverUrl = res.thumbnail || '';
            if (!coverUrl && Array.isArray(res.thumbnails) && res.thumbnails.length > 0) {
                coverUrl = res.thumbnails[res.thumbnails.length - 1].url || '';
            }
            if (!coverUrl && res.id) {
                coverUrl = `https://i.ytimg.com/vi/${res.id}/mqdefault.jpg`;
            }

            return {
                title,
                artists,
                coverUrl,
                url: `https://www.youtube.com/watch?v=${res.id}`,
                source: SourceType.YOUTUBE
            };
        });
    } finally {
        if (cookieFile && fs.existsSync(cookieFile)) {
            try { fs.unlinkSync(cookieFile); } catch (e) { }
        }
    }
};

/**
 * Orchestrates metadata extraction from various sources.
 */
export const getTrackInfo = async (url: string, cookies?: any[]): Promise<TrackMetadata[]> => {
    const source = getSourceFromUrl(url);

    if (source === SourceType.YOUTUBE && url.includes('list=')) {
        return await getPlaylistInfo(url, cookies);
    }

    switch (source) {
        case SourceType.YOUTUBE: {
            if (cookies && cookies.length > 0 && !validateCookies(cookies)) {
                throw new Error('Invalid cookie format.');
            }

            const info = await executeYtDlp(url, cookies);
            const { title: parsedTitle, artists: parsedArtists } = parseArtistsTitle(info.title || 'Unknown Title', info.uploader || 'Unknown Artist');

            const spotifyInfo = await searchSpotifyTrack(parsedArtists[0], parsedTitle);
            if (spotifyInfo) {
                console.log(`[Spotify] Found match for YouTube track: ${spotifyInfo.artists.join(', ')} - ${spotifyInfo.title}`);
                return [{ ...spotifyInfo, source: SourceType.YOUTUBE, url }];
            }

            const coverUrl = info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url || '';
            return [{ title: parsedTitle, artists: parsedArtists, coverUrl, source: SourceType.YOUTUBE, url }];
        }

        case SourceType.SOUNDCLOUD: {
            return await pRetry(async () => {
                const info = await scdl.getInfo(url);
                const { title, artists } = parseArtistsTitle(info.title || "Unknown Title", info.user?.username || "Unknown Artist");
                let coverUrl = info.artwork_url || info.user?.avatar_url || "";
                if (coverUrl) coverUrl = coverUrl.replace('-large', '-t500x500');
                return [{ title, artists, coverUrl, source: SourceType.SOUNDCLOUD, url }];
            }, { retries: 2 });
        }

        case SourceType.SPOTIFY: {
            const trackIdMatch = url.match(/track\/([a-zA-Z0-9]+)/);
            if (!trackIdMatch) throw new Error("Invalid Spotify track URL");
            const info = await getSpotifyTrackInfo(trackIdMatch[1]);
            return [{ ...info, url }];
        }

        case SourceType.DEEZER: {
            let targetUrl = url;
            if (url.includes('deezer.page.link') || url.includes('link.deezer.com') || !url.includes('/track/')) {
                try {
                    const response = await fetch(url, { redirect: 'follow' });
                    targetUrl = response.url;
                } catch (e) {
                    console.warn(`[Deezer] Redirect failed: ${e}`);
                }
            }

            const trackIdMatch = targetUrl.match(/track\/([0-9]+)/);
            if (!trackIdMatch) {
                const info = await executeYtDlp(targetUrl);
                return [{
                    title: info.track || info.title,
                    artists: info.artist ? [info.artist] : [],
                    coverUrl: info.thumbnail || '',
                    source: SourceType.DEEZER,
                    url: targetUrl
                }];
            }
            const info = await getDeezerTrackInfo(trackIdMatch[1]);
            return [{ ...info, url: targetUrl }];
        }

        case SourceType.APPLE_MUSIC: {
            const info = await executeYtDlp(url);
            return [{
                title: info.track || info.title,
                artists: info.artist ? [info.artist] : [],
                coverUrl: info.thumbnail || '',
                source: SourceType.APPLE_MUSIC,
                url
            }];
        }

        default:
            throw new Error("Unsupported URL.");
    }
};

/**
 * Downloads media and covers and processes them with FFmpeg.
 */
export const downloadMedia = async (url: string, cookies?: any[], overrides?: { title?: string, artists?: string[] }, audioSubPath?: string, coverSubPath?: string): Promise<DownloadResult> => {
    const targetMp3Dir = audioSubPath ? path.join(MP3_DIR, audioSubPath) : MP3_DIR;
    const targetCoverDir = coverSubPath ? path.join(COVER_DIR, coverSubPath) : COVER_DIR;

    if (!fs.existsSync(targetMp3Dir)) fs.mkdirSync(targetMp3Dir, { recursive: true });
    if (!fs.existsSync(targetCoverDir)) fs.mkdirSync(targetCoverDir, { recursive: true });

    const metadataResults = await getTrackInfo(url, cookies);
    if (metadataResults.length === 0) throw new Error('No metadata found for URL');
    const metadata = metadataResults[0];

    if (overrides) {
        if (overrides.title) metadata.title = overrides.title;
        if (overrides.artists && overrides.artists.length > 0) metadata.artists = overrides.artists;
    }

    const artistString = metadata.artists.join(', ');
    const filenameBase = sanitizeFilename(`${metadata.title}-${artistString}`);
    const mp3Path = path.join(targetMp3Dir, `${filenameBase}.mp3`);
    const coverPath = path.join(targetCoverDir, `${filenameBase}.jpg`);

    const tempBasePath = path.join(targetMp3Dir, `temp-${Date.now()}`);
    let downloadUrl = url;

    if ([SourceType.SPOTIFY, SourceType.DEEZER, SourceType.APPLE_MUSIC].includes(metadata.source)) {
        const query = `${metadata.artists.join(' ')} - ${metadata.title}`;
        console.log(`[Search] YouTube search for: ${query}`);
        downloadUrl = `ytsearch1:${query}`;
    }

    if (metadata.source !== SourceType.SOUNDCLOUD) {
        const ytdlpArgs = [
            '-f', 'bestaudio',
            '--output', `${tempBasePath}.%(ext)s`,
            '--no-playlist',
            '--js-runtimes', 'node'
        ];

        if (FFMPEG_STATIC_PATH) ytdlpArgs.push('--ffmpeg-location', FFMPEG_STATIC_PATH);

        let cookiesFile: string | null = null;
        if (cookies && cookies.length > 0) {
            cookiesFile = writeCookiesFile(cookies);
            ytdlpArgs.push('--cookies', cookiesFile);
        }

        try {
            await pRetry(async () => {
                await execFileAsync(YTDLP_PATH, [...ytdlpArgs, downloadUrl], { timeout: 300000 });
            }, { retries: 2 });

            const files = fs.readdirSync(targetMp3Dir).filter(f => f.startsWith(`temp-`) && f.includes(tempBasePath.split(path.sep).pop()!));
            if (files.length === 0) throw new Error('Downloaded audio file not found');
            const tempAudioPath = path.join(targetMp3Dir, files[0]);

            await new Promise<void>((resolve, reject) => {
                ffmpeg(tempAudioPath)
                    .audioBitrate(320)
                    .save(mp3Path)
                    .outputOptions('-metadata', `title=${metadata.title}`, '-metadata', `artist=${artistString}`)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });

            if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        } finally {
            if (cookiesFile && fs.existsSync(cookiesFile)) try { fs.unlinkSync(cookiesFile); } catch (e) { }
        }
    } else {
        const audioStream = await scdl.download(url);
        await new Promise<void>((resolve, reject) => {
            ffmpeg(audioStream)
                .audioBitrate(320)
                .save(mp3Path)
                .outputOptions('-metadata', `title=${metadata.title}`, '-metadata', `artist=${artistString}`)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }

    if (metadata.coverUrl) {
        try {
            await pRetry(() => downloadImage(metadata.coverUrl, coverPath), { retries: 2 });
        } catch (e) {
            console.error("Failed to download cover:", e);
        }
    }

    const relativeMp3Path = path.relative(MP3_DIR, mp3Path).replace(/\\/g, '/');
    const relativeCoverPath = path.relative(COVER_DIR, coverPath).replace(/\\/g, '/');

    return {
        mp3Path: `/mp3/${relativeMp3Path}`,
        coverPath: `/cover/${relativeCoverPath}`,
        metadata
    };
};

/**
 * Returns a media stream for playback.
 */
export const getMediaStream = async (url: string, cookies?: any[], overrides?: { title?: string, artists?: string[] }) => {
    const metadataResults = await getTrackInfo(url, cookies);
    if (metadataResults.length === 0) throw new Error('No metadata found for URL');
    const metadata = metadataResults[0];

    if (overrides) {
        if (overrides.title) metadata.title = overrides.title;
        if (overrides.artists && overrides.artists.length > 0) metadata.artists = overrides.artists;
    }

    const artistString = metadata.artists.join(', ');
    const filename = sanitizeFilename(`${metadata.title}-${artistString}`) + '.mp3';

    let inputStream: Readable;
    let downloadUrl = url;

    if ([SourceType.SPOTIFY, SourceType.DEEZER, SourceType.APPLE_MUSIC].includes(metadata.source)) {
        const query = `${metadata.artists.join(' ')} - ${metadata.title}`;
        downloadUrl = `ytsearch1:${query}`;
    }

    if (metadata.source !== SourceType.SOUNDCLOUD) {
        const ytdlpArgs = [
            '-f', 'bestaudio',
            '--output', '-',
            '--no-playlist',
            '--js-runtimes', 'node'
        ];

        if (FFMPEG_STATIC_PATH) ytdlpArgs.push('--ffmpeg-location', FFMPEG_STATIC_PATH);

        let cookiesFile: string | null = null;
        if (cookies && cookies.length > 0) {
            cookiesFile = writeCookiesFile(cookies);
            ytdlpArgs.push('--cookies', cookiesFile);
        }

        const ytProcess = spawn(YTDLP_PATH, [...ytdlpArgs, downloadUrl]);
        inputStream = ytProcess.stdout;

        ytProcess.on('close', () => {
            if (cookiesFile && fs.existsSync(cookiesFile)) {
                try { fs.unlinkSync(cookiesFile); } catch (e) { }
            }
        });
    } else {
        inputStream = await scdl.download(url);
    }

    const outStream = new PassThrough();

    ffmpeg(inputStream)
        .audioBitrate(320)
        .format('mp3')
        .outputOptions(
            '-metadata', `title=${metadata.title}`,
            '-metadata', `artist=${artistString}`,
            '-id3v2_version', '3',
            '-write_id3v1', '1'
        )
        .on('error', (err) => {
            console.error('[FFmpeg Stream Error]', err);
            outStream.destroy(err);
        })
        .pipe(outStream);

    return {
        stream: outStream,
        filename,
        metadata
    };
};
