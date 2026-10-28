import React from 'react';
import { MovieImage } from './MovieImage.jsx';

/**
 * Destaca el primer resultado real de la cartelera en la página 1 cuando no hay búsqueda activa.
 * Utiliza backdrop local y datos reales sin inventar información ni controles ficticios.
 */
export function HeroFeatured({ movie, onSelect }) {
  if (!movie) return null;

  const year = movie.year || (movie.release_date ? movie.release_date.slice(0, 4) : null);
  const ratingText = typeof movie.vote_average === 'number' && movie.vote_average > 0
    ? `${movie.vote_average.toFixed(1)}/10`
    : null;

  return (
    <section className="featured-hero" aria-label="Película destacada en Cartelera">
      <MovieImage
        src={movie.backdrop_url || movie.poster_url}
        alt=""
        className="featured-backdrop"
        type="backdrop"
        loading="eager"
      />
      <div className="featured-gradient" aria-hidden="true" />

      <div className="featured-content">
        <span className="featured-badge">Destacada en Cartelera</span>
        <h2 className="featured-title">{movie.title}</h2>

        <div className="featured-meta">
          {year && (
            <span className="featured-meta-item">
              <strong>{year}</strong>
            </span>
          )}
          {ratingText && (
            <span className="featured-meta-item featured-rating">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{ratingText}</span>
            </span>
          )}
          {movie.original_language && (
            <span className="featured-meta-item">
              Idioma: {movie.original_language.toUpperCase()}
            </span>
          )}
        </div>

        {movie.overview && (
          <p className="featured-overview">
            {movie.overview}
          </p>
        )}

        <button
          type="button"
          className="btn-featured-details"
          onClick={() => onSelect(movie.id)}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Ver detalles
        </button>
      </div>
    </section>
  );
}
