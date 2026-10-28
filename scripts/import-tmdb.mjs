import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const { TMDB_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Configura las claves de TMDB y Supabase en el archivo local .env.');
  process.exit(1);
}
const mediaDirectory = path.resolve('data/media');
await fs.mkdir(mediaDirectory, { recursive: true });
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function request(url, image = false) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { Accept: image ? 'image/*' : 'application/json' } });
      if (!response.ok) throw new Error('El proveedor respondió HTTP ' + response.status);
      if (image) {
        if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Respuesta de imagen no válida');
        if (Number(response.headers.get('content-length')) > 5_000_000) throw new Error('Imagen demasiado grande');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 5_000_000) throw new Error('Imagen demasiado grande');
        return bytes;
      }
      return await response.json();
    } catch {
      if (attempt === 3) throw new Error(image ? 'No se pudo descargar una imagen después de tres intentos.' : 'No se pudo consultar TMDB después de tres intentos. Revisa la clave y la conexión.');
      await delay(attempt * 800);
    }
  }
}
async function tmdb(endpoint, parameters = {}) {
  const url = new URL('https://api.themoviedb.org/3/' + endpoint);
  url.search = new URLSearchParams({ api_key: TMDB_API_KEY, language: 'es-MX', ...parameters });
  return request(url);
}
async function imageFile(id, kind, source, size) {
  if (!source) return null;
  if (!/^\/[A-Za-z0-9_-]+\.(jpg|png)$/.test(source)) throw new Error('La ruta de imagen del proveedor no es válida.');
  const extension = path.extname(source);
  const filename = String(id) + '-' + kind + extension;
  const bytes = await request('https://image.tmdb.org/t/p/' + size + source, true);
  const target = path.join(mediaDirectory, filename);
  await fs.writeFile(target + '.tmp', bytes);
  await fs.rename(target + '.tmp', target);
  return '/media/' + filename;
}

try {
  let ids;
  if (process.argv.includes('--reuse-selection')) {
    ids = JSON.parse(await fs.readFile('data/selection.json', 'utf8'));
    console.log('Se reutilizó la selección original para verificar la actualización sin duplicados.');
  } else {
    const pages = Number(process.env.TMDB_IMPORT_PAGES || 5);
    if (!Number.isSafeInteger(pages) || pages < 1 || pages > 10) throw new Error('TMDB_IMPORT_PAGES debe ser un entero de 1 a 10.');
    ids = [];
    for (let page = 1; page <= pages; page++) {
      const data = await tmdb('movie/popular', { page: String(page) });
      if (!Array.isArray(data.results)) throw new Error('TMDB no devolvió un listado válido.');
      ids.push(...data.results.filter((movie) => !movie.adult).map((movie) => movie.id));
      console.log('Página pública descargada: ' + page + ' de ' + pages);
    }
  }
  ids = [...new Set(ids)];
  if (!ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error('La selección de películas no es válida.');
  const movies = new Array(ids.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < ids.length) {
      const index = cursor++;
      const data = await tmdb('movie/' + ids[index]);
      if (data.id !== ids[index] || !data.title) throw new Error('Detalle de película no válido.');
      movies[index] = {
        id: data.id, title: data.title, original_title: data.original_title || data.title,
        release_date: data.release_date || null,
        poster_url: await imageFile(data.id, 'poster', data.poster_path, 'w342'),
        backdrop_url: await imageFile(data.id, 'backdrop', data.backdrop_path, 'w780'),
        overview: data.overview || '', runtime: data.runtime || null,
        vote_average: Number.isFinite(data.vote_average) ? data.vote_average : null,
        original_language: data.original_language || null,
        source_url: 'https://www.themoviedb.org/movie/' + data.id,
        genres: Array.isArray(data.genres) ? data.genres : []
      };
      if ((index + 1) % 20 === 0 || index + 1 === ids.length) console.log('Detalles e imágenes procesados: ' + (index + 1) + '/' + ids.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: imported, error } = await supabase.rpc('import_movie_catalog', { payload: movies });
  if (error || imported !== movies.length) throw new Error('La transacción de carga no se completó.');
  const { count, error: countError } = await supabase.from('movies').select('id', { count: 'exact', head: true });
  if (countError || count < imported) throw new Error('No se pudo verificar la persistencia de la carga.');
  await fs.writeFile('data/selection.json', JSON.stringify(ids, null, 2) + '\n');
  const summary = { importadas: imported, persistidas: count, posters: movies.filter((movie) => movie.poster_url).length, fondos: movies.filter((movie) => movie.backdrop_url).length };
  await fs.writeFile('evidencias/resumen-importacion.json', JSON.stringify(summary, null, 2) + '\n');
  console.log('Carga transaccional terminada y verificada: ' + JSON.stringify(summary));
} catch (error) {
  console.error('Importación detenida: ' + error.message);
  process.exitCode = 1;
}
