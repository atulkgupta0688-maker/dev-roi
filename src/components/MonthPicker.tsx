interface Props {
  value: string; // "YYYY-MM" or ""
  onChange: (value: string) => void;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

export function MonthPicker({ value, onChange, className = '' }: Props) {
  const [selYear, selMonth] = value ? value.split('-') : ['', ''];

  const handleMonth = (m: string) => {
    const y = selYear || String(currentYear);
    onChange(`${y}-${m}`);
  };

  const handleYear = (y: string) => {
    const m = selMonth || '01';
    onChange(`${y}-${m}`);
  };

  const selectClass =
    'flex-1 bg-[#0F1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 ' +
    'focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 ' +
    'appearance-none cursor-pointer hover:border-white/20 transition-colors ' + className;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select
          className={selectClass}
          value={selMonth ?? ''}
          onChange={(e) => handleMonth(e.target.value)}
        >
          <option value="" disabled>Month</option>
          {MONTHS.map((name, i) => {
            const val = String(i + 1).padStart(2, '0');
            return <option key={val} value={val}>{name}</option>;
          })}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">▾</span>
      </div>
      <div className="relative w-28">
        <select
          className={selectClass}
          value={selYear ?? ''}
          onChange={(e) => handleYear(e.target.value)}
        >
          <option value="" disabled>Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">▾</span>
      </div>
    </div>
  );
}
