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
      <img
        src="/kishan-bhaiya-logo.png"
        alt=""
        className="h-10 w-12 shrink-0 object-contain sm:h-12 sm:w-14"
        aria-hidden="true"
      />
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
