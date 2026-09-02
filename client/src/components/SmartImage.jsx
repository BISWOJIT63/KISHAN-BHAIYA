import React from 'react';
import { assetUrl, avatarPlaceholder, producePlaceholder } from '../utils/assets.js';

/**
 * Every server-provided image goes through here so that (a) relative upload paths
 * get re-based onto the API origin and (b) a missing or unreachable file falls
 * back to a visible placeholder. The previous behaviour was `display:none` on
 * error, which turned a broken image into an unexplained blank box.
 */
export default function SmartImage({
  src,
  alt = '',
  className = '',
  variant = 'produce',
  ...rest
}) {
  const fallback = variant === 'avatar' ? avatarPlaceholder : producePlaceholder;
  const resolved = assetUrl(src) || fallback;
  const [current, setCurrent] = React.useState(resolved);

  // Re-arm when the source changes, otherwise a previous failure sticks.
  React.useEffect(() => setCurrent(resolved), [resolved]);

  return (
    <img
      loading="lazy"
      {...rest}
      src={current}
      alt={alt}
      className={className}
      onError={() => setCurrent((value) => (value === fallback ? value : fallback))}
    />
  );
}
