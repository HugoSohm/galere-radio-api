/**
 * Body for the /info endpoint.
 */
export interface InfoBody {
    url: string;
    cookies?: any[] | string;
}

/**
 * Data for a single track in a download request.
 */
export interface DownloadTrack {
    url: string;
    title?: string;
    artists?: string[] | string;
    playlists?: string[];
}

/**
 * Body for the /download endpoint.
 */
export interface DownloadBody {
    tracks: DownloadTrack[];
    cookies?: any[] | string;
}

/**
 * Body for the /stream endpoint.
 */
export interface StreamBody {
    url: string;
    title?: string;
    artists?: string[] | string;
    cookies?: any[] | string;
}
