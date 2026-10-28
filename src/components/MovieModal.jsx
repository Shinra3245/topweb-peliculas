import React, { useEffect, useState, useRef } from 'react';
import { MovieImage } from './MovieImage.jsx';

/**
 * Modal de detalle de película con consulta protegida a GET /api/movies/:id.
 * Gestiona estados de carga, error con reintento, cancelación con AbortController,
 * cierre accesible con tecla Escape o backdrop, bloqueo de scroll y restauración de foco.
 */
export function MovieModal({ movieId, session, onClose }) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const backdropRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Guardar foco previo y bloquear scroll del fondo
  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Poner el foco en el botón de cerrar tras el montaje
    if (closeBtnRef.current) {
      closeBtnRef.current.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        prevFocusRef.current.focus();
      }
    };
  }, []);

  // Manejar teclado (Escape para cerrar y navegación por foco)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const controls = backdropRef.current?.querySelectorAll('button:not([disabled]),a[href],input,[tabindex="0"]');
        const first = controls?.[0]; const last = controls?.[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cargar datos de la película con AbortController
  useEffect(() => {
    if (!movieId || !session?.access_token) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/movies/${movieId}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status}: no se pudo cargar la película`);
        }
        return res.json();
      })
      .then((data) => {
        setMovie(data);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Error al obtener los detalles de la película');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [movieId, session?.access_token, retryCount]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const formatRuntime = (runtime) => {
    if (!runtime || runtime <= 0) return null;
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m (${runtime} min)`;
    }
    return `${runtime} min`;
  };

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-movie-title"
      >
        <button
          type="button"
          ref={closeBtnRef}
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Cerrar detalles de la película"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading && (
          <div className="state-container" style={{ margin: 0, minHeight: '380px' }}>
            <div className="spinner" />
            <h3 className="state-title">Cargando detalles</h3>
            <p className="state-message">Consultando la información cinematográfica...</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-container" style={{ margin: 0, minHeight: '380px' }}>
            <div className="state-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="state-title">Error al cargar detalles</h3>
            <p className="state-message">{error}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRetry}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && movie && (
          <>
            <div className="modal-backdrop-header">
              <MovieImage
                src={movie.backdrop_url || movie.poster_url}
                alt=""
                className="modal-backdrop-img"
                type="backdrop"
                loading="eager"
              />
              <div className="modal-backdrop-overlay" aria-hidden="true" />
            </div>

            <div className="modal-body">
              <div className="modal-poster-col">
                <div className="movie-poster-wrapper">
                  <MovieImage
                    src={movie.poster_url}
                    alt={movie.title}
                    className="movie-poster-img"
                    type="poster"
                    loading="eager"
                  />
                </div>
              </div>

              <div className="modal-details-col">
                <h2 id="modal-movie-title" className="modal-title">
                  {movie.title}
                </h2>

                {movie.original_title && movie.original_title !== movie.title && (
                  <p className="modal-original-title">
                    Título original: {movie.original_title}
                  </p>
                )}

                <div className="modal-meta-row">
                  {movie.year && (
                    <span className="modal-meta-item">
                      <strong>{movie.year}</strong>
                    </span>
                  )}

                  {typeof movie.vote_average === 'number' && movie.vote_average > 0 && (
                    <span className="modal-rating-badge" aria-label={`Calificación: ${movie.vote_average.toFixed(1)} de 10`}>
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {movie.vote_average.toFixed(1)} / 10
                    </span>
                  )}

                  {movie.runtime && (
                    <span className="modal-meta-item">
                      {formatRuntime(movie.runtime)}
                    </span>
                  )}
                </div>

                {Array.isArray(movie.genres) && movie.genres.length > 0 && (
                  <div className="modal-genres" aria-label="Géneros">
                    {movie.genres.map((genre) => (
                      <span key={genre.id} className="genre-pill">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                <h3 className="modal-section-title">Sinopsis</h3>
                <p className="modal-overview">
                  {movie.overview && movie.overview.trim().length > 0
                    ? movie.overview
                    : 'Sinopsis no disponible.'}
                </p>

                <div className="modal-extra-info">
                  {movie.release_date && (
                    <div className="modal-info-item">
                      <span className="modal-info-label">Estreno</span>
                      <span className="modal-info-val">{movie.release_date}</span>
                    </div>
                  )}

                  {movie.original_language && (
                    <div className="modal-info-item">
                      <span className="modal-info-label">Idioma original</span>
                      <span className="modal-info-val">{movie.original_language.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
