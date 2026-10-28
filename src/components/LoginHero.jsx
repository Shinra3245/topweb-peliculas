import React from 'react';

/**
 * Pantalla de bienvenida / acceso previo a la autenticación.
 * Composición tipográfica sobria inspirada en el cine con siluetas geométricas de fotograma,
 * sin inventar assets ficticios ni elementos ajenos a la cartelera.
 */
export function LoginHero({ onLogin, authError, onDismissError, isAuthenticating }) {
  return (
    <div className="login-hero-container">
      {authError && (
        <div className="alert-banner" role="alert" style={{ maxWidth: '640px', width: '100%' }}>
          <span className="alert-message">{authError}</span>
          {onDismissError && (
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={onDismissError}
              aria-label="Descartar aviso de error"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="login-frame-wrapper">
        <div className="film-strip-top" aria-hidden="true" />

        <h1 className="login-logo">Cartelera</h1>
        <p className="login-tagline">El cine en tus manos</p>
        <p className="login-description">
          Explora títulos, géneros y detalles cinematográficos con una experiencia visual
          diseñada para los amantes del cine.
        </p>

        <div className="login-actions">
          <button
            type="button"
            className="btn-github-login"
            onClick={onLogin}
            disabled={isAuthenticating}
            aria-label="Iniciar sesión con GitHub para acceder al catálogo"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>{isAuthenticating ? 'Conectando...' : 'Iniciar sesión con GitHub'}</span>
          </button>
          <span className="login-security-note">
            Acceso seguro mediante OAuth. No se solicitan contraseñas privadas.
          </span>
        </div>

        <div className="film-strip-bottom" aria-hidden="true" />
      </div>
    </div>
  );
}
