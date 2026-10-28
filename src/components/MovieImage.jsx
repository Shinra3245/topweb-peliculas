import React, { useState, useEffect } from 'react';

/**
 * Componente de imagen de película con carga diferida (lazy loading)
 * y un contenedor de reserva (placeholder) accesible en caso de ausencia o error de carga.
 * Respeta el contrato: imágenes locales /media/ID-poster.jpg o /media/ID-backdrop.jpg sin fetch externo.
 */
export function MovieImage({
  src,
  alt = '',
  className = '',
  type = 'poster',
  loading = 'lazy'
}) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => setHasError(false), [src]);

  // Si no hay fuente o falló la carga local, renderizar placeholder accesible
  if (!src || hasError) {
    return (
      <div
        className={`image-placeholder ${type === 'backdrop' ? 'backdrop-placeholder' : 'poster-placeholder'} ${className}`}
        role="img"
        aria-label={alt ? `${alt} (sin imagen disponible)` : 'Imagen no disponible'}
      >
        <svg
          aria-hidden="true"
          width={type === 'backdrop' ? '36' : '30'}
          height={type === 'backdrop' ? '36' : '30'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
        <span className="image-placeholder-text">
          {alt || 'Sin imagen'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
    />
  );
}
