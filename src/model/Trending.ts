export interface Trending {
    page: number; // Defaults to 0
    results: Array<TrendingResult>;
    total_pages: number; // Defaults to 0
    total_results: number; // Defaults to 0
}

export interface TrendingResult {
    adult: boolean; // Defaults to true
    backdrop_path: string;
    id: number; // Defaults to 0
    title: string;
    original_language: string;
    original_title: string;
    overview: string;
    poster_path: string;
    media_type: string;
    genre_ids: number[];
    popularity: number; // Defaults to 0
    release_date: string;
    video: boolean; // Defaults to true
    vote_average: number; // Defaults to 0
    vote_count: number; // Defaults to 0
}