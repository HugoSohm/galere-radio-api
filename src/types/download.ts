export interface InfoBody {
    url: string;
    cookies?: any[] | string;
}

export interface DownloadBody {
    url: string;
    title?: string;
    artists?: string[] | string;
    cookies?: any[] | string;
    mp3SubPath?: string;
    coverSubPath?: string;
}
