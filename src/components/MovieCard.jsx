import React from 'react';
import { MovieImage } from './MovieImage.jsx';

/**
 * Tarjeta de película individual para el catálogo.
 * Ratio 2:3, interactiva, accesible mediante teclado y con foco restaurable.
 */
export function MovieCard({ movie, onSelect }) {
  const year = movie.year || (movie.release_date ? movie.release_date.slice(0, 4) : null);
  const ratingText = typeof movie.vote_average === 'number' && movie.vote_average > 0
    ? `${movie.vote_average.toFixed(1)}/10`
    : null;

  return (
    <button
      type="button"
      className="movie-card"
      onClick={() => onSelect(movie.id)}
      aria-label={`Ver detalles de ${movie.title}${year ? ` (${year})` : ''}`}
    >
      <div className="movie-poster-wrapper">
        <MovieImage
          src={movie.poster_url}
          alt={movie.title}
          className="movie-poster-img"
          type="poster"
          loading="lazy"
        />
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.title}</h3>
        <div className="movie-card-footer">
          {year && <span className="movie-card-year">{year}</span>}
          {ratingText && (
            <span className="movie-card-rating" aria-label={`Calificación: ${ratingText}`}>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {ratingText}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
