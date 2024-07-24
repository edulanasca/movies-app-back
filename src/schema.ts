import { buildSchema } from 'graphql';
import axios from 'axios';
import { Trending } from './model/Trending';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

const API_KEY = process.env.API_KEY;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key_here';

interface User {
  username: string;
  password: string;
  favorites: { id: number; type: string }[];
}

export const users: { [key: string]: User } = {};

const schema = buildSchema(`
  type Query {
    movie(id: Int!): Movie
    tvseries(id: Int!): TVSeries
    trending: [TrendingResultUnion]
    search(keyword: String): [TrendingResultUnion]
    credits(id: Int!, type: String!): [Cast]
    me: User
    favorites: [TrendingResultUnion]
  }

  type Mutation {
    register(username: String!, password: String!): String
    login(username: String!, password: String!): String
    logout: Boolean
    addFavorite(id: Int!, type: String!): Favorite
    removeFavorite(id: Int!): Boolean
  }

  type User {
    id: ID
    username: String
  }

  type Favorite {
    id: Int!
    type: String!
  }

  type Trending {
    page: Int
    results: [TrendingResultUnion!]!
    total_pages: Int
    total_results: Int
  }
  
  union TrendingResultUnion = Movie | TVSeries

  type Movie {
    id: Int
    adult: Boolean
    backdrop_path: String
    belongs_to_collection: String
    budget: Int
    genres: [Genre!]!
    homepage: String
    imdb_id: String
    original_language: String
    original_title: String
    overview: String
    popularity: Float
    poster_path: String
    production_companies: [ProductionCompany!]!
    production_countries: [ProductionCountry!]!
    release_date: String
    revenue: Int
    runtime: Int
    spoken_languages: [SpokenLanguage!]!
    status: String
    tagline: String
    title: String
    video: Boolean
    vote_average: Float
    vote_count: Int
    media_type: String
    isFav: Boolean
  }
  
  type Genre {
    id: Int
    name: String
  }
  
  type ProductionCompany {
    id: Int
    logo_path: String
    name: String
    origin_country: String
  }
  
  type ProductionCountry {
    iso_3166_1: String
    name: String
  }
  
  type SpokenLanguage {
    english_name: String
    iso_639_1: String
    name: String
  }

  type TVSeries {
    adult: Boolean
    backdrop_path: String
    created_by: [Creator!]!
    episode_run_time: [Int!]!
    first_air_date: String
    genres: [Genre!]!
    homepage: String
    id: Int
    in_production: Boolean
    languages: [String!]!
    last_air_date: String
    last_episode_to_air: Episode
    next_episode_to_air: String
    networks: [Network!]!
    number_of_episodes: Int
    number_of_seasons: Int
    origin_country: [String!]!
    original_language: String
    name: String
    original_name: String
    overview: String
    popularity: Float
    poster_path: String
    production_companies: [ProductionCompany!]!
    production_countries: [ProductionCountry!]!
    seasons: [Season!]!
    spoken_languages: [SpokenLanguage!]!
    status: String
    tagline: String
    title: String
    type: String
    vote_average: Float
    vote_count: Int
    media_type: String
    isFav: Boolean
  }
  
  type Creator {
    id: Int
    credit_id: String
    name: String
    gender: Int
    profile_path: String
  }
  
  type Episode {
    id: Int
    name: String
    overview: String
    vote_average: Float
    vote_count: Int
    air_date: String
    episode_number: Int
    production_code: String
    runtime: Int
    season_number: Int
    show_id: Int
    still_path: String
  }
  
  type Network {
    id: Int
    logo_path: String
    name: String
    origin_country: String
  }
  
  type Season {
    air_date: String
    episode_count: Int
    id: Int
    name: String
    overview: String
    poster_path: String
    season_number: Int
    vote_average: Float
  }

  type Cast {
    adult: Boolean
    gender: Int
    id: Int
    known_for_department: String
    name: String
    original_name: String
    popularity: Float
    profile_path: String
    character: String
    credit_id: String
    order: Int
  }
`);

const resolvers = {
  async movie({ id }: { id: number }) {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}`);
    return response.data;
  },
  async tvseries({ id }: { id: number }) {
    const response = await axios.get(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}`);
    return response.data;
  },
  async trending(_: any, context: { user?: User }) {
    const response = await axios.get<Trending>(`https://api.themoviedb.org/3/trending/all/day?api_key=${API_KEY}`);
    return context.user !== undefined ?
      response.data.results.map(it => ({ ...it, __typename: it.media_type === 'movie' ? 'Movie' : 'TVSeries', isFav: users[context.user!.username].favorites.some(fav => fav.id === it.id) })) :
      response.data.results.map(it => ({ ...it, __typename: it.media_type === 'movie' ? 'Movie' : 'TVSeries' }));
  },
  async search({ keyword }: { keyword: string }, context: { user?: User }) {
    const response = await axios.get<Trending>(`https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${keyword}&include_adult=false&language=en-US&page=1`);
    return context.user !== undefined ?
      response.data.results.map(it => ({ ...it, __typename: it.media_type === 'movie' ? 'Movie' : 'TVSeries', isFav: users[context.user!.username].favorites.some(fav => fav.id === it.id) })) :
      response.data.results.map(it => ({ ...it, __typename: it.media_type === 'movie' ? 'Movie' : 'TVSeries' }));
  },
  async register({ username, password }: { username: string; password: string }, { res }: { res: Response }) {
    const user = users[username];
    if (user) {
      throw new Error('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { username, password: hashedPassword, favorites: [] };

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'strict', // Protect against CSRF
      maxAge: 3600000, // 1 hour in milliseconds
    });

    return 'User registered successfully';
  },
  async login({ username, password }: { username: string; password: string }, { res }: { res: Response }) {
    const user = users[username];
    if (!user) {
      throw new Error('User does not exist');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid password');
    }
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'strict', // Protect against CSRF
      maxAge: 3600000, // 1 hour in milliseconds
    });

    return 'Login successful';
  },
  async logout(_: any, { res }: { res: Response }) {
    res.clearCookie('auth_token');
    return true;
  },
  async credits({ id, type }: { id: number; type: string }) {
    const response = await axios.get(`https://api.themoviedb.org/3/${type}/${id}/credits?api_key=${API_KEY}`);
    return response.data.cast;
  },
  async favorites(_: any, context: { user?: User }) {
    if (!context.user) {
      throw new Error('Not authenticated');
    }
    const favs = [];

    for (const fav of context.user.favorites) {
      const response = await axios.get(`https://api.themoviedb.org/3/${fav.type}/${fav.id}?api_key=${API_KEY}`);
      favs.push({ ...response.data, __typename: fav.type === 'movie' ? 'Movie' : 'TVSeries', isFav: true });
    }
    return favs;
  },
  me(_: any, context: { user?: User }) {
    return { username: context.user?.username };
  },
  addFavorite({ id, type }: { id: number; type: string }, context: { user?: User }) {
    if (!context.user) {
      throw new Error('Not authenticated');
    }
    const favorite = { id, type };
    context.user.favorites.push(favorite);
    return favorite;
  },
  removeFavorite({ id }: { id: number }, context: { user?: User }) {
    if (!context.user) {
      throw new Error('Not authenticated');
    }
    const index = context.user.favorites.findIndex(fav => fav.id === id);
    if (index !== -1) {
      context.user.favorites.splice(index, 1);
      return true;
    }
    return false;
  },
};


export { schema, resolvers, SECRET_KEY };