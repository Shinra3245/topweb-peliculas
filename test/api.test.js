import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const authService = { getUser: async (token) => ({ user: token === 'sesion-de-prueba' ? { id: 'usuario-prueba' } : null }) };
const sample = { id: 1, title: 'Película de prueba', year: 2026, genres: [{ id: 1, name: 'Drama' }], runtime: 110, poster_url: null };
const movieService = {
  list: async ({ page, pageSize, q, token }) => {
    assert.equal(token, 'sesion-de-prueba');
    return { items: q === 'sin coincidencias' ? [] : [sample], total: q === 'sin coincidencias' ? 0 : 1, page, pageSize, totalPages: q === 'sin coincidencias' ? 0 : 1 };
  },
  getById: async (id) => id === 1 ? sample : null
};
describe('API propia de Películas', () => {
  let server, base;
  before(async () => {
    const app = createApp({ supabaseUrl: 'http://127.0.0.1:54361', supabaseAnonKey: 'clave-publica-de-prueba', authService, movieService });
    server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    base = 'http://127.0.0.1:' + server.address().port;
  });
  after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  const get = (route, authenticated = true) => fetch(base + route, { headers: authenticated ? { Authorization: 'Bearer sesion-de-prueba' } : {} });
  it('informa disponibilidad sin credenciales privadas', async () => {
    const response = await get('/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'cartelera-api' });
  });
  it('entrega solo la configuración pública de Auth', async () => {
    const response = await get('/api/config');
    assert.deepEqual(await response.json(), { supabaseUrl: 'http://127.0.0.1:54361', supabaseAnonKey: 'clave-publica-de-prueba' });
  });
  it('rechaza solicitudes sin sesión', async () => {
    const response = await get('/api/movies', false);
    assert.equal(response.status, 401); await response.json();
  });
  it('rechaza una sesión inválida', async () => {
    const response = await fetch(base + '/api/movies', { headers: { Authorization: 'Bearer invalido' } });
    assert.equal(response.status, 401); await response.json();
  });
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=texto', 'page=1&page=2', 'pageSize=0', 'pageSize=25', 'pageSize=texto', 'page=9007199254740991&pageSize=24', 'q=' + 'a'.repeat(101)]) {
    it('rechaza parámetros inválidos: ' + query.slice(0, 70), async () => {
      const response = await get('/api/movies?' + query);
      assert.equal(response.status, 400); await response.json();
    });
  }
  it('mantiene el contrato de paginación y transmite la sesión al servicio', async () => {
    const response = await get('/api/movies?page=2&pageSize=6');
    const data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.page, 2); assert.equal(data.pageSize, 6); assert.equal(data.items[0].title, sample.title);
  });
  it('representa una búsqueda vacía correctamente', async () => {
    const response = await get('/api/movies?q=sin%20coincidencias');
    const data = await response.json(); assert.equal(data.total, 0); assert.equal(data.items.length, 0);
  });
  it('entrega el detalle y sus géneros', async () => {
    const response = await get('/api/movies/1');
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), sample);
  });
  it('responde 404 para una película inexistente', async () => {
    const response = await get('/api/movies/999'); assert.equal(response.status, 404); await response.json();
  });
  it('rechaza identificadores inválidos', async () => {
    const response = await get('/api/movies/abc'); assert.equal(response.status, 400); await response.json();
  });
  it('responde en JSON ante una ruta API inexistente', async () => {
    const response = await get('/api/no-existe'); assert.equal(response.status, 404); assert.ok((await response.json()).error);
  });
  it('no convierte una imagen ausente en una página HTML', async () => {
    const response = await get('/media/inexistente.jpg'); assert.equal(response.status, 404); await response.text();
  });
  it('maneja fallos del servicio sin exponer detalles internos', async () => {
    const app = createApp({ authService, movieService: { list: async () => { throw new Error('detalle privado de postgres'); } } });
    const instance = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    try {
      const response = await fetch('http://127.0.0.1:' + instance.address().port + '/api/movies', { headers: { Authorization: 'Bearer sesion-de-prueba' } });
      assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('detalle privado'));
    } finally { instance.closeAllConnections(); await new Promise((resolve) => instance.close(resolve)); }
  });
});
