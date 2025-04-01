import { NetMDService } from './netmd';
import { AudioExportService } from './audio-export';
import { MediaRecorderService } from './mediarecorder';
import { MediaSessionService } from './media-session';

// Last.fm API service interface
export interface LastFmService {
    getAlbumInfo(
        artist: string,
        album: string
    ): Promise<{
        images?: { small?: string; medium?: string; large?: string; extralarge?: string; mega?: string };
    }>;
    getTrackInfo(
        artist: string,
        track: string
    ): Promise<{
        album?: {
            title?: string;
            artist?: string;
            images?: { small?: string; medium?: string; large?: string; extralarge?: string; mega?: string };
        };
    }>;
}

// Last.fm API service implementation class
export class LastFmAPIService implements LastFmService {
    // Get API key from environment variable
    private readonly API_KEY = process.env.REACT_APP_LASTFM_API_KEY;
    private readonly API_URL = 'https://ws.audioscrobbler.com/2.0/';
    private readonly MAX_RETRIES = 1; // Maximum retries for API calls

    async getAlbumInfo(artist: string, album: string): Promise<{ images?: any }> {
        // Return empty result if album name is missing
        if (!album) {
            console.log('Last.fm API: Album name is missing');
            return {};
        }

        try {
            // If artist name is missing, search by album name only
            const url = `${this.API_URL}?method=album.getinfo&api_key=${this.API_KEY}${
                artist ? `&artist=${encodeURIComponent(artist)}` : ''
            }&album=${encodeURIComponent(album)}&autocorrect=1&format=json`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.error('Last.fm API error:', data.message);
                return {};
            }

            // Extract image information from result
            const images: any = {};
            if (data.album && data.album.image) {
                data.album.image.forEach((img: any) => {
                    if (img.size && img['#text']) {
                        images[img.size] = img['#text'];
                    }
                });
            }

            return { images };
        } catch (error) {
            console.error('Last.fm API call error:', error);
            return {};
        }
    }

    async getTrackInfo(artist: string, track: string): Promise<{ album?: any }> {
        // 트랙 이름이 없으면 빈 결과 반환
        if (!track) {
            console.log('Last.fm API: Track name is missing');
            return {};
        }

        try {
            // 아티스트 이름이 없으면 트랙 이름만으로 검색
            const url = `${this.API_URL}?method=track.getinfo&api_key=${this.API_KEY}&track=${encodeURIComponent(track)}${
                artist ? `&artist=${encodeURIComponent(artist)}` : ''
            }&autocorrect=1&format=json`;
            const response = await fetch(url);

            // 서버가 응답하지 않는 경우
            if (!response.ok) {
                console.error(`Last.fm API response error: ${response.status} ${response.statusText}`);
                return {};
            }

            const data = await response.json();

            if (data.error) {
                console.error('Last.fm API error:', data.message);
                return {};
            }

            // 트랙에서 앨범 정보 추출
            if (!data.track || !data.track.album) {
                return {};
            }

            const album: any = {
                title: data.track.album.title,
                artist: data.track.album.artist,
                images: {},
            };

            // 앨범 이미지 추출
            if (data.track.album.image) {
                data.track.album.image.forEach((img: any) => {
                    if (img.size && img['#text']) {
                        album.images[img.size] = img['#text'];
                    }
                });
            }

            return { album };
        } catch (error) {
            console.error('Last.fm API call error:', error);
            return {};
        }
    }
}

interface ServiceRegistry {
    netmdService?: NetMDService;
    audioExportService?: AudioExportService;
    mediaRecorderService?: MediaRecorderService;
    mediaSessionService?: MediaSessionService;
    lastFmService?: LastFmService;
}

const ServiceRegistry: ServiceRegistry = {};

export default ServiceRegistry;
