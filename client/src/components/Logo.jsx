import { Link } from 'react-router-dom';

/**
 * `min-w-0` + `truncate` are load-bearing: the navbar is a flex row, and without
 * them the wordmark refuses to shrink and pushes the cart/bell/menu buttons off
 * the right edge on 320-375px phones.
 */
export default function Logo({ light = false }) {
  return (
    <Link
      to="/"
      className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5"
      aria-label="KisanExpress home"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl sm:h-10 sm:w-10 ${light ? 'bg-white' : 'bg-forest-900'}`}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
          <path
            d="M5 19c9-1 14-8 22-15 0 13-6 23-18 23-2 0-4-1-5-3 5-4 10-8 17-12-8 3-12 5-16 7z"
            fill={light ? '#34885e' : '#a7d65b'}
          />
        </svg>
      </span>
      <span
        className={`truncate font-display text-[15px] font-extrabold tracking-[-.05em] xs:text-lg sm:text-xl ${light ? 'text-white' : 'text-forest-950'}`}
      >
        KisanExpress
      </span>
    </Link>
  );
}
