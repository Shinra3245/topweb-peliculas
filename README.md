# Cartelera — Explorador de Películas

Práctica integradora de Tópicos Avanzados de Desarrollo Web. Incluye acceso OAuth con GitHub, buscador, tarjetas con póster y año, detalle y paginación.

## Arquitectura

```text
TMDB → importador Node.js → Supabase local (películas, géneros y relaciones)
          ↓                              ↓
  imágenes locales               API propia Express
          ↓                              ↓
                 React + Vite
```

El navegador consulta los datos mediante la API propia y obtiene las imágenes desde archivos locales. Solo el importador se comunica con TMDB. Supabase Auth gestiona la sesión OAuth; las consultas del backend usan el token del usuario y respetan RLS.

## Requisitos

- Node.js 24 y npm.
- Docker en ejecución.
- Credenciales propias de una aplicación OAuth de GitHub.
- Clave de desarrollador de TMDB para la importación inicial.

## Instalación

```bash
npm ci
cp .env.example .env
```

Configure `GITHUB_CLIENT_ID`, `GITHUB_SECRET` y `TMDB_API_KEY` en el archivo privado `.env`. La aplicación OAuth debe permitir:

- Página principal: `http://localhost:4320`
- Callback del proveedor: `http://127.0.0.1:54361/auth/v1/callback`

```bash
npm run db:start
npx supabase status
```

Copie las claves locales correspondientes a `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en `.env`. No publique este archivo. El primer arranque aplica las migraciones de `supabase/migrations/`. Para actualizaciones posteriores sin borrar datos utilice `npx supabase migration up --local`.

```bash
npm run import
npm run build
npm start
```

Abra **http://localhost:4320**. La aplicación funciona localmente y no necesita despliegue público. `npm run db:stop` detiene solo la instancia de esta práctica. La configuración deshabilita servicios opcionales para reducir memoria.

## Puertos

| Servicio | Puerto |
|---|---:|
| Aplicación Express y frontend compilado | 4320 |
| Vite, desarrollo opcional | 5320 |
| Supabase API y Auth | 54361 |
| PostgreSQL | 54362 |

Para desarrollar el frontend use `npm run dev`, manteniendo Express activo en otra terminal.

## Carga y persistencia

`npm run import` obtiene cinco páginas de películas populares, excluye contenido adulto y deduplica identificadores. Consulta los detalles en español y descarga pósteres y fondos. `TMDB_IMPORT_PAGES` permite seleccionar entre 1 y 10 páginas.

Las imágenes se guardan en `data/media/`, excluido de Git; se generan al importar. `data/selection.json` registra los identificadores de la última selección y permite repetirla:

```bash
npm run import -- --reuse-selection
```

La función SQL `import_movie_catalog` actualiza películas, géneros y relaciones en una transacción. Una carga inválida se revierte completa. Las claves primarias y la relación compuesta de géneros evitan duplicados.

## Modelo de datos

- `movies`: identificador de TMDB, título, título original, fecha, imágenes locales, sinopsis, duración, puntuación, idioma, origen y fecha de carga.
- `genres`: identificador y nombre del género.
- `movie_genres`: relación entre películas y géneros, con clave primaria compuesta.

RLS está activo. Solo los usuarios autenticados pueden leer el catálogo; no pueden modificarlo ni ejecutar la función de carga. La clave administrativa se utiliza únicamente en el importador.

## API propia

| Ruta | Acceso |
|---|---|
| `GET /api/health` | Público, disponibilidad |
| `GET /api/config` | Público, configuración pública de Auth |
| `GET /api/movies?page=1&pageSize=12&q=texto` | Sesión válida |
| `GET /api/movies/ID` | Sesión válida |
| `GET /media/archivo.jpg` | Imagen local previamente importada |

El tamaño de página admite de 1 a 24 elementos. La búsqueda admite hasta 100 caracteres. La API valida parámetros, verifica sesiones y maneja errores sin exponer información interna.

## Verificación

- 22 pruebas automatizadas del backend aprobadas.
- Primera carga real: 98 películas, 17 géneros y 258 relaciones.
- 98 pósteres y 97 fondos disponibles; se contempla la ausencia de imágenes.
- Integridad de relaciones, permisos y reversión transaccional comprobados en PostgreSQL.
- Validación de interfaz y OAuth: pendiente de integración final.

```bash
npm test
npm run build
```

Los registros y resultados se guardan en `evidencias/`. Las pruebas automatizadas del backend no sustituyen la validación de OAuth y navegación en el navegador real.

## Créditos

Datos, imágenes y logo: [TMDB](https://www.themoviedb.org/). Uso académico no comercial.

This product uses the TMDB API but is not endorsed or certified by TMDB.

- [Documentación de TMDB](https://developer.themoviedb.org/docs/getting-started)
- [Supabase local](https://supabase.com/docs/guides/local-development)
- [OAuth GitHub con Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-github)
