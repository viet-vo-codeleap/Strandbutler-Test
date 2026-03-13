import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { Client } from '@elastic/elasticsearch';
import {
    Movie,
    Series,
    Season,
    Episode,
    Genre,
    ContentGenre,
    Asset,
    ContentItem,
} from '../src/entities';
import { config } from 'dotenv';

// Load env vars
config({ path: path.join(__dirname, '../.env') });

const dataSourceOptions = {
    type: 'postgres',
    host: process.env.CONTENT_DB_HOST || 'localhost',
    port: parseInt(process.env.CONTENT_DB_PORT || '5432'),
    username: process.env.CONTENT_DB_USERNAME || 'postgres',
    password: process.env.CONTENT_DB_PASSWORD || 'postgres',
    database: process.env.CONTENT_DB_NAME || 'flixzone_content',
    entities: [path.join(__dirname, '../src/entities/*.entity.ts')],
    synchronize: true,
};

const dataSource = new DataSource(dataSourceOptions as any);

// Elasticsearch client
const esHost = process.env.ELASTICSEARCH_NODE || 'http://elasticsearch:9200';
const esIndexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'flixzone';
const esIndexName = `${esIndexPrefix}_content`;

const esClient = new Client({
    node: esHost,
});

// Helper to download files
async function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                https.get(response.headers.location!, (res) => {
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', reject);
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }
        }).on('error', reject);
    });
}

// Prepare document for Elasticsearch
function prepareEsDocument(content: any, contentType: 'movie' | 'series') {
    const doc: any = {
        content_id: content.content_id,
        title: content.title,
        description: content.description,
        content_type: contentType,
        release_date: content.release_date,
        age_rating: content.age_rating,
        created_at: content.created_at,
        updated_at: content.updated_at,
        slug: content.slug,
    };

    if (content.genres && Array.isArray(content.genres)) {
        doc.genres = content.genres.map((cg: any) => ({
            genre_id: cg.genre?.genre_id || cg.genre_id,
            name: cg.genre?.name || '',
        }));
    }

    if (content.assets && Array.isArray(content.assets)) {
        const poster = content.assets.find((a: any) => a.asset_type === 'poster');
        if (poster) doc.poster_url = poster.asset_url;
    }

    if (contentType === 'movie' && content.duration_minutes) {
        doc.duration_minutes = content.duration_minutes;
    }
    if (contentType === 'series' && content.status) {
        doc.series_status = content.status;
    }

    return doc;
}

// Index content to Elasticsearch
async function indexToElasticsearch(contents: any[], contentType: 'movie' | 'series') {
    if (contents.length === 0) return;

    console.log(`Indexing ${contents.length} ${contentType}s to Elasticsearch...`);

    const operations = contents.flatMap((content) => [
        { index: { _index: esIndexName, _id: content.content_id } },
        prepareEsDocument(content, contentType),
    ]);

    try {
        const bulkResponse = await esClient.bulk({
            operations,
            refresh: true,
        });

        if (bulkResponse.errors) {
            const erroredDocuments = bulkResponse.items.filter((item: any) => item.index?.error);
            console.error(`Bulk indexing had ${erroredDocuments.length} errors`);
        } else {
            console.log(`Successfully indexed ${contents.length} ${contentType}s to Elasticsearch`);
        }
    } catch (error: any) {
        console.error(`Failed to index to Elasticsearch: ${error.message}`);
    }
}

async function createDatabase() {
    const options = { ...dataSourceOptions, database: 'postgres', synchronize: false };
    const ds = new DataSource(options as any);
    try {
        await ds.initialize();
        const dbName = process.env.CONTENT_DB_NAME || 'flixzone_content';
        const runner = ds.createQueryRunner();
        const result = await runner.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (result.length === 0) {
            console.log(`Creating database ${dbName}...`);
            await runner.query(`CREATE DATABASE "${dbName}"`);
        }
        await ds.destroy();
    } catch (e: any) {
        console.log('Could not check/create database:', e.message);
    }
}

async function bootstrap() {
    await createDatabase();
    await dataSource.initialize();
    console.log('Database connected');

    const movieRepo = dataSource.getRepository(Movie);
    const seriesRepo = dataSource.getRepository(Series);
    const seasonRepo = dataSource.getRepository(Season);
    const episodeRepo = dataSource.getRepository(Episode);
    const genreRepo = dataSource.getRepository(Genre);
    const contentGenreRepo = dataSource.getRepository(ContentGenre);
    const assetRepo = dataSource.getRepository(Asset);

    // Check if data already exists
    const existingMovies = await movieRepo.count();
    const existingSeries = await seriesRepo.count();

    if (existingMovies > 10 || existingSeries > 10) {
        console.log(`Database already seeded (${existingMovies} movies, ${existingSeries} series).`);

        // Check if Elasticsearch needs indexing
        try {
            const esCount = await esClient.count({ index: esIndexName });
            if (esCount.count < 10) {
                console.log('Elasticsearch is empty, re-indexing from PostgreSQL...');
                const allMovies = await movieRepo.find({ relations: ['genres', 'genres.genre', 'assets'] });
                const allSeries = await seriesRepo.find({ relations: ['genres', 'genres.genre', 'assets'] });
                await indexToElasticsearch(allMovies, 'movie');
                await indexToElasticsearch(allSeries, 'series');
            } else {
                console.log(`Elasticsearch already has ${esCount.count} documents. Skipping.`);
            }
        } catch (e: any) {
            console.log('Elasticsearch check failed:', e.message);
        }

        await dataSource.destroy();
        return;
    }

    console.log('Database is empty or has minimal data. Starting seed...');

    // Download data files if they don't exist
    const moviesFile = path.join(__dirname, '../temp_wiki_movies.json');
    const tvShowsFile = path.join(__dirname, '../temp_tv_shows.json');

    if (!fs.existsSync(moviesFile)) {
        console.log('Downloading movies data...');
        await downloadFile('https://raw.githubusercontent.com/prust/wikipedia-movie-data/master/movies.json', moviesFile);
    }

    if (!fs.existsSync(tvShowsFile)) {
        console.log('Downloading TV shows data...');
        await downloadFile('https://gist.githubusercontent.com/luckyshot/7b7b34982ace4ee2710c/raw/tvshows.js', tvShowsFile);
    }

    // Load Movies
    console.log('Loading movies data...');
    const moviesDataRaw = JSON.parse(fs.readFileSync(moviesFile, 'utf-8'));
    const moviesData = moviesDataRaw.filter((m: any) => m.year >= 2010).reverse();
    console.log(`Found ${moviesData.length} movies from 2010+`);

    // Load TV Shows
    console.log('Loading TV shows data...');
    let tvShowsRaw = fs.readFileSync(tvShowsFile, 'utf-8');
    tvShowsRaw = tvShowsRaw.replace(/^var shows = /, '').replace(/;$/, '');
    const tvShowsData = JSON.parse(tvShowsRaw);
    console.log(`Found ${tvShowsData.shows.length} TV shows`);

    let count = 0;
    const targetMovies = 700;
    const targetSeries = 300;

    // Genres Cache
    const genresCache = new Map < string, Genre> ();

    async function getGenre(name: string) {
        if (!name) return null;
        if (genresCache.has(name)) return genresCache.get(name);
        let genre = await genreRepo.findOne({ where: { name } });
        if (!genre) {
            genre = genreRepo.create({ name });
            await genreRepo.save(genre);
        }
        genresCache.set(name, genre);
        return genre;
    }

    // Store created content for ES indexing
    const createdMovies: Movie[] = [];
    const createdSeries: Series[] = [];

    // Process Movies
    console.log('Processing movies...');
    for (const m of moviesData.slice(0, targetMovies)) {
        try {
            const movie = new Movie();
            movie.title = m.title;
            movie.slug = faker.helpers.slugify(m.title + '-' + m.year).toLowerCase();
            movie.description = m.extract || faker.lorem.paragraph();
            movie.release_date = new Date(m.year, 0, 1);
            movie.age_rating = faker.helpers.arrayElement(['P', 'K', 'T13', 'T16', 'T18']);
            movie.duration_minutes = faker.number.int({ min: 80, max: 180 });
            movie.stream_asset_id = `asset_${faker.string.alphanumeric(10)}`;

            const existing = await movieRepo.findOne({ where: { slug: movie.slug } });
            if (existing) {
                movie.slug += '-' + faker.string.alphanumeric(4);
            }

            const savedMovie = await movieRepo.save(movie);

            const movieGenres: ContentGenre[] = [];
            if (m.genres && Array.isArray(m.genres)) {
                for (const gName of m.genres) {
                    const genre = await getGenre(gName);
                    if (genre) {
                        const cg = await contentGenreRepo.save({ content: savedMovie, genre });
                        movieGenres.push({ ...cg, genre } as ContentGenre);
                    }
                }
            }

            const posterUrl = m.thumbnail || faker.image.url();
            const asset = await assetRepo.save({
                content: savedMovie,
                asset_type: 'poster',
                asset_url: posterUrl,
                language: 'en-US'
            });

            // Store for ES indexing with relations
            savedMovie.genres = movieGenres;
            savedMovie.assets = [asset];
            createdMovies.push(savedMovie);

            count++;
            if (count % 100 === 0) console.log(`Created ${count} movies`);
        } catch (e: any) {
            console.error(`Error creating movie ${m.title}:`, e.message);
        }
    }

    // Process Series
    console.log('Processing series...');
    for (const title of tvShowsData.shows.slice(0, targetSeries)) {
        try {
            const series = new Series();
            series.title = title;
            series.slug = faker.helpers.slugify(title).toLowerCase();

            const existing = await seriesRepo.findOne({ where: { slug: series.slug } });
            if (existing) {
                series.slug += '-' + faker.string.alphanumeric(4);
            }

            series.description = faker.lorem.paragraph();
            // Use past dates that are actually in the past (not future)
            const yearsAgo = faker.number.int({ min: 1, max: 10 });
            series.release_date = new Date(new Date().getFullYear() - yearsAgo, faker.number.int({ min: 0, max: 11 }), faker.number.int({ min: 1, max: 28 }));
            series.age_rating = faker.helpers.arrayElement(['P', 'K', 'T13', 'T16', 'T18']);
            series.status = faker.helpers.arrayElement(['Ongoing', 'Ended']);

            const savedSeries = await seriesRepo.save(series);

            const seriesGenres: ContentGenre[] = [];
            const randomGenres = faker.helpers.arrayElements(['Drama', 'Comedy', 'Action', 'Sci-Fi', 'Thriller', 'Romance'], { min: 1, max: 3 });
            for (const gName of randomGenres) {
                const genre = await getGenre(gName);
                if (genre) {
                    const cg = await contentGenreRepo.save({ content: savedSeries, genre });
                    seriesGenres.push({ ...cg, genre } as ContentGenre);
                }
            }

            const asset = await assetRepo.save({
                content: savedSeries,
                asset_type: 'poster',
                asset_url: faker.image.url(),
                language: 'en-US'
            });

            // Store for ES indexing with relations
            savedSeries.genres = seriesGenres;
            savedSeries.assets = [asset];
            createdSeries.push(savedSeries);

            // Seasons (1-5)
            const numSeasons = faker.number.int({ min: 1, max: 5 });
            for (let i = 1; i <= numSeasons; i++) {
                const season = new Season();
                season.series = savedSeries;
                season.season_number = i;
                season.title = `Season ${i}`;
                season.description = faker.lorem.sentence();
                season.release_date = new Date(savedSeries.release_date.getFullYear() + i - 1, faker.number.int({ min: 0, max: 11 }), 1);

                const savedSeason = await seasonRepo.save(season);

                // Episodes (5-10)
                const numEpisodes = faker.number.int({ min: 5, max: 10 });
                for (let j = 1; j <= numEpisodes; j++) {
                    const episode = new Episode();
                    episode.season = savedSeason;
                    episode.episode_number = j;
                    episode.title = `Episode ${j}`;
                    episode.description = faker.lorem.sentence();
                    episode.duration_minutes = faker.number.int({ min: 20, max: 60 });
                    episode.stream_asset_id = `asset_${faker.string.alphanumeric(10)}`;

                    await episodeRepo.save(episode);
                }
            }

            count++;
            if (count % 100 === 0) console.log(`Created ${count - targetMovies} series`);
        } catch (e: any) {
            console.error(`Error creating series ${title}:`, e.message);
        }
    }

    console.log('PostgreSQL seeding complete!');

    // Index to Elasticsearch
    console.log('Indexing to Elasticsearch...');
    await indexToElasticsearch(createdMovies, 'movie');
    await indexToElasticsearch(createdSeries, 'series');

    console.log('Seeding complete!');
    await dataSource.destroy();
}

bootstrap().catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
});
