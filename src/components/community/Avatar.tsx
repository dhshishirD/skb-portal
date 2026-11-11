import { avatarTone, initials } from '@/lib/community/model';

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
} as const;

const DOTS = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
} as const;

/** A round avatar made from the person's initials. The colour is the same every time for one person. */
export function Avatar({
  id,
  name,
  size = 'md',
  online,
}: {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  /** true = online dot, false = grey dot, undefined = no dot */
  online?: boolean;
}) {
  const tone = avatarTone(id);
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden="true"
        className={`${SIZES[size]} inline-flex items-center justify-center rounded-full font-semibold tracking-wide`}
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        {initials(name)}
      </span>
      {online !== undefined && (
        <span
          className={`${DOTS[size]} absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className="sr-only">{online ? 'Online' : 'Offline'}</span>
        </span>
      )}
    </span>
  );
}
