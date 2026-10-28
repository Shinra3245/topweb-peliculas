import React, { useState, useEffect, useRef } from 'react';
import { initializeAuth } from './auth.js';
import { Header } from './components/Header.jsx';
import { Footer } from './components/Footer.jsx';
import { HeroFeatured } from './components/HeroFeatured.jsx';
import { MovieCard } from './components/MovieCard.jsx';
import { MovieModal } from './components/MovieModal.jsx';
import { LoginHero } from './components/LoginHero.jsx';

export function App() {
  // Estado de autenticación
  const [authClient, setAuthClient] = useState(null);
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Estado de películas
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [moviesError, setMoviesError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Modal de detalle (id único, evita apilamiento)
  const [selectedMovieId, setSelectedMovieId] = useState(null);

  // 1. Inicialización de Auth según contrato:
  // initializeAuth singleton con active bool, subscription cleanup y onAuthStateChange
  useEffect(() => {
    let active = true;
    let subscription = null;

    initializeAuth()
      .then(({ client, session: initialSession, authError: initialError }) => {
        if (!active) return;
        setAuthClient(client);
        setSession(initialSession);
        if (initialError) {
          setAuthError(initialError);
        }
        if (client?.auth) {
          const { data } = client.auth.onAuthStateChange((_event, newSession) => {
            if (!active) return;
            setSession(newSession);
          });
          subscription = data?.subscription;
        }
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(err?.message || 'El servicio de acceso no está disponible. Intenta de nuevo más tarde.');
      })
      .finally(() => {
        if (active) {
          setLoadingAuth(false);
        }
      });

    return () => {
      active = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // 2. Debounce para la búsqueda de películas
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Volver a la página 1 cuando cambia el término de búsqueda
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Consulta de películas protegida con AbortController
  useEffect(() => {
    if (!session?.access_token) return;

    const controller = new AbortController();
    setLoadingMovies(true);
    setMoviesError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: '12'
    });

    if (debouncedQuery.trim()) {
      params.set('q', debouncedQuery.trim());
    }

    fetch(`/api/movies?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status}: no se pudieron cargar las películas`);
        }
        return res.json();
      })
      .then((data) => {
        setMovies(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === 'number' ? data.total : (data.items?.length || 0));
        setTotalPages(typeof data.totalPages === 'number' ? Math.max(1, data.totalPages) : 1);
        setMoviesError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setMoviesError(err.message || 'Error al consultar el catálogo de películas.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingMovies(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [session?.access_token, page, debouncedQuery, retryTrigger]);

  // Manejo de Login OAuth
  const handleLogin = async () => {
    if (!authClient) return;
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      const { error } = await authClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err?.message || 'No se pudo conectar con el proveedor de acceso GitHub.');
      setIsAuthenticating(false);
    }
  };

  // Manejo de Logout local y limpieza
  const handleLogout = async () => {
    if (authClient?.auth) {
      try {
        const { error } = await authClient.auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch (err) {
        setAuthError('No se pudo cerrar la sesión. Intenta de nuevo.');
        return;
      }
    }
    setSession(null);
    setSelectedMovieId(null);
    setMovies([]);
    setTotal(0);
    setTotalPages(1);
    setPage(1);
    setSearchQuery('');
    setDebouncedQuery('');
    setMoviesError(null);
    setIsAuthenticating(false);
  };

  // Restablecer navegación a la página inicial de catálogo
  const handleResetNavigation = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setPage(1);
  };

  const handleRetryMovies = () => {
    setRetryTrigger((prev) => prev + 1);
  };

  // Estado de carga inicial de autenticación
  if (loadingAuth) {
    return (
      <div className="app-container">
        <div className="state-container" style={{ margin: 'auto' }}>
          <div className="spinner" />
          <h2 className="state-title">Cartelera</h2>
          <p className="state-message">Abriendo Cartelera...</p>
        </div>
      </div>
    );
  }

  // Vista no autenticada: Hero de bienvenida / Login
  if (!session) {
    return (
      <div className="app-container">
        <LoginHero
          onLogin={handleLogin}
          authError={authError}
          onDismissError={() => setAuthError(null)}
          isAuthenticating={isAuthenticating}
        />
        <Footer />
      </div>
    );
  }

  // Vista autenticada
  const isFirstPageNoSearch = page === 1 && !debouncedQuery.trim();
  const featuredMovie = isFirstPageNoSearch && movies.length > 0 ? movies[0] : null;

  return (
    <div className="app-container">
      <Header
        session={session}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery('')}
        onLogout={handleLogout}
        onResetNavigation={handleResetNavigation}
      />

      <main className="main-content">
        {/* Banner de error de autenticación si ocurriera durante sesión */}
        {authError && (
          <div className="alert-banner" role="alert">
            <span className="alert-message">{authError}</span>
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={() => setAuthError(null)}
              aria-label="Cerrar aviso"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Destacado cinematográfico: solo página 1 sin búsqueda activa */}
        {featuredMovie && !loadingMovies && !moviesError && (
          <HeroFeatured
            movie={featuredMovie}
            onSelect={(id) => setSelectedMovieId(id)}
          />
        )}

        {/* Cabecera del catálogo y conteo */}
        <div className="catalog-header">
          <h1 className="catalog-title">
            {debouncedQuery.trim() ? `Resultados: "${debouncedQuery}"` : 'Cartelera de Cine'}
          </h1>
          {!loadingMovies && !moviesError && (
            <span className="catalog-count">
              {total === 0
                ? '0 películas encontradas'
                : total === 1
                ? '1 película disponible'
                : `Mostrando ${movies.length} de ${total} películas`}
            </span>
          )}
        </div>

        {/* Estado de error al cargar películas con botón Reintentar */}
        {moviesError && (
          <div className="state-container" role="alert">
            <div className="state-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="state-title">No se pudieron cargar las películas</h2>
            <p className="state-message">{moviesError}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRetryMovies}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Estado de carga con esqueletos (skeleton) */}
        {loadingMovies && (
          <div className="movies-grid" aria-busy="true" aria-label="Cargando películas...">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="skeleton-card">
                <div className="skeleton-poster" />
                <div className="skeleton-info">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Catálogo vacío */}
        {!loadingMovies && !moviesError && movies.length === 0 && (
          <div className="state-container">
            <div className="state-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h2 className="state-title">Sin resultados</h2>
            <p className="state-message">
              {debouncedQuery.trim()
                ? `No encontramos películas para "${debouncedQuery}". Intenta con otro término o título.`
                : 'No hay películas disponibles en la cartelera en este momento.'}
            </p>
            {debouncedQuery.trim() && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetNavigation}
              >
                Ver todo el catálogo
              </button>
            )}
          </div>
        )}

        {/* Grid de películas */}
        {!loadingMovies && !moviesError && movies.length > 0 && (
          <div className="movies-grid" role="region" aria-label="Catálogo de películas">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onSelect={(id) => setSelectedMovieId(id)}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {!loadingMovies && !moviesError && totalPages > 1 && (
          <nav className="pagination-container" aria-label="Navegación de páginas de la cartelera">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => {
                setPage((prev) => Math.max(1, prev - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page <= 1}
              aria-label="Ir a la página anterior"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Anterior
            </button>

            <span className="pagination-info" aria-live="polite">
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              className="pagination-btn"
              onClick={() => {
                setPage((prev) => Math.min(totalPages, prev + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page >= totalPages}
              aria-label="Ir a la página siguiente"
            >
              Siguiente
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </nav>
        )}
      </main>

      <Footer />

      {/* Modal de detalle: solo si hay una película seleccionada (sin apilar) */}
      {selectedMovieId && (
        <MovieModal
          movieId={selectedMovieId}
          session={session}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
}
