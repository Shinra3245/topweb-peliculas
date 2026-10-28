import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_FIELDS = 'id,title,original_title,release_date,poster_url,backdrop_url,overview,runtime,vote_average,original_language,movie_genres(genres(id,name))';
const normalizeMovie = ({ movie_genres = [], ...movie }) => ({
  ...movie,
  year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
  genres: movie_genres.map((link) => link.genres).filter(Boolean)
});

export function createApp(options = {}) {
  const {
    supabaseUrl = process.env.SUPABASE_URL,
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY,
    authService,
    movieService,
    distPath = path.resolve('dist'),
    mediaPath = path.resolve('data/media')
  } = options;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  const configured = () => Boolean(supabaseUrl && supabaseAnonKey);
  const clientFor = (token) => createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: 'Bearer ' + token } }
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'cartelera-api' }));
  app.get('/api/config', (_req, res) => {
    if (!configured()) return res.status(503).json({ error: 'El servicio de acceso no está configurado.' });
    res.json({ supabaseUrl, supabaseAnonKey });
  });

  const requireAuth = async (req, res, next) => {
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ error: 'Inicia sesión para consultar el catálogo.' });
    if (!configured() && !authService) return res.status(503).json({ error: 'El servicio de acceso no está disponible.' });
    try {
      const result = authService
        ? await authService.getUser(match[1])
        : await clientFor(match[1]).auth.getUser(match[1]);
      const user = result.data?.user || result.user;
      if (result.error || !user) return res.status(401).json({ error: 'La sesión no es válida. Vuelve a iniciar sesión.' });
      req.user = user;
      req.authToken = match[1];
      next();
    } catch {
      res.status(503).json({ error: 'No se pudo verificar la sesión. Intenta de nuevo.' });
    }
  };
  app.get('/api/movies', requireAuth, async (req, res) => {
    const integer = (value, fallback, max) => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
      const number = Number(value);
      return Number.isSafeInteger(number) && number >= 1 && number <= max ? number : null;
    };
    const page = integer(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = integer(req.query.pageSize, 12, 24);
    if (page === null || pageSize === null || !Number.isSafeInteger((page - 1) * pageSize + pageSize - 1)) {
      return res.status(400).json({ error: 'La página debe ser un entero positivo y el tamaño debe estar entre 1 y 24.' });
    }
    if (req.query.q !== undefined && (typeof req.query.q !== 'string' || req.query.q.length > 100)) {
      return res.status(400).json({ error: 'La búsqueda admite hasta 100 caracteres.' });
    }
    const q = (req.query.q || '').trim();
    try {
      if (movieService) return res.json(await movieService.list({ page, pageSize, q, token: req.authToken }));
      let query = clientFor(req.authToken).from('movies').select(CATALOG_FIELDS, { count: 'exact' });
      if (q) query = query.ilike('title', '%' + q.replace(/[\\%_]/g, '\\$&') + '%');
      const from = (page - 1) * pageSize;
      const { data, count, error } = await query.order('title').order('id').range(from, from + pageSize - 1);
      if (error) throw error;
      res.json({ items: data.map(normalizeMovie), total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) });
    } catch {
      res.status(503).json({ error: 'El catálogo no está disponible. Intenta de nuevo.' });
    }
  });
  app.get('/api/movies/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'El identificador de película no es válido.' });
    }
    try {
      let movie;
      if (movieService) movie = await movieService.getById(id, { token: req.authToken });
      else {
        const { data, error } = await clientFor(req.authToken).from('movies').select(CATALOG_FIELDS).eq('id', id).maybeSingle();
        if (error) throw error;
        movie = data ? normalizeMovie(data) : null;
      }
      if (!movie) return res.status(404).json({ error: 'Película no encontrada.' });
      res.json(movie);
    } catch {
      res.status(503).json({ error: 'No se pudo cargar el detalle. Intenta de nuevo.' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
  app.use('/media', express.static(mediaPath, { index: false, dotfiles: 'deny', maxAge: '1d' }));
  app.use('/media', (_req, res) => res.status(404).end());
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  return app;
}
