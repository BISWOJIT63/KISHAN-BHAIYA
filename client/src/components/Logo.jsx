import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';

/**
 * `min-w-0` + `truncate` are load-bearing: the navbar is a flex row, and without
 * them the wordmark refuses to shrink and pushes the cart/bell/menu buttons off
 * the right edge on 320-375px phones.
 */
export default function Logo({ light = false }) {
  const user = useAppStore((state) => state.user);
  const homePath = user?.role === 'consumer' ? '/stores' : '/';

  return (
    <Link
      to={homePath}
      className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5"
      aria-label="KISHAN BHAIYA home"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 ${light ? 'bg-white' : 'bg-forest-600'}`}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
          <path
            d="M5 19c9-1 14-8 22-15 0 13-6 23-18 23-2 0-4-1-5-3 5-4 10-8 17-12-8 3-12 5-16 7z"
            fill={light ? '#15803d' : '#ffffff'}
          />
        </svg>
      </span>
      <span
        className={`truncate font-display text-[14px] font-extrabold tracking-[.025em] xs:text-base sm:text-lg ${light ? 'text-white' : 'text-gray-950'}`}
      >
        KISHAN BHAIYA
      </span>
      <span className={`hidden border-l pl-2 text-[10px] font-semibold leading-4 lg:block ${light ? 'border-white/25 text-white/65' : 'border-gray-300 text-gray-500'}`}>
        Digital Agriculture<br />Platform
      </span>
    </Link>
  );
}
