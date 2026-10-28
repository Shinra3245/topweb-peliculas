import React from 'react';

/**
 * Header compacto con marca Cartelera a la izquierda, búsqueda accesible al centro
 * e información/cierre de sesión a la derecha.
 */
export function Header({
  session,
  searchQuery,
  onSearchChange,
  onSearchClear,
  onLogout,
  onResetNavigation
}) {
  const username =
    session?.user?.user_metadata?.user_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split('@')[0] ||
    'Usuario';

  const avatarInitial = (username.charAt(0) || 'U').toUpperCase();

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          type="button"
          className="brand-link"
          onClick={onResetNavigation}
          aria-label="Cartelera - Ir al inicio del catálogo"
        >
          <span className="brand-title">Cartelera</span>
        </button>

        <div className="header-search">
          <form className="search-form" onSubmit={handleSubmit} role="search">
            <span className="search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              className="search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar películas por título..."
              aria-label="Buscar películas por título"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={onSearchClear}
                aria-label="Limpiar búsqueda"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </form>
        </div>

        <div className="header-user">
          <div className="user-identity" title={session?.user?.email || username}>
            <div className="user-avatar-placeholder" aria-hidden="true">
              {avatarInitial}
            </div>
            <span className="user-name">{username}</span>
          </div>

          <button
            type="button"
            className="btn-signout"
            onClick={onLogout}
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
