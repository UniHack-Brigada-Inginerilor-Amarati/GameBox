export interface Media {
    id: string;
    url?: string;
    filename?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    mediaField?: {
        url: string;
        alt?: string;
        filename: string;
        width: number;
        height: number;
    };
}