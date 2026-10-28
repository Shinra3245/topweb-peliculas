import React from 'react';

/**
 * Footer con atribución a TMDB conforme a los términos de uso y las especificaciones.
 * Mantiene el logo y aviso de TMDB menos prominente que la marca Cartelera.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand" aria-label="Cartelera">
          Cartelera
        </div>

        <div className="tmdb-attribution-block">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="tmdb-logo-link"
            aria-label="Sitio web oficial de The Movie Database (se abre en pestaña nueva)"
          >
            <img
              src="/tmdb-logo.svg"
              alt="The Movie Database"
              className="tmdb-logo"
              width="80"
              height="16"
              loading="lazy"
            />
          </a>
          <p className="tmdb-legal-notice">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>

        <p className="footer-copy">
          Cartelera &copy; 2026 &mdash; Explorador cinematográfico.
        </p>
      </div>
    </footer>
  );
}
