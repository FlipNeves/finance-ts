import { usePrivacy } from '../contexts/PrivacyContext';
import { formatBRL, formatBRLCompact } from '../lib/format';
import './Money.css';

type Sign = 'none' | 'auto' | 'positive' | 'negative' | 'up' | 'down';
type Tone = 'neutral' | 'income' | 'expense' | 'auto';

interface MoneyProps {
  value: number;
  sign?: Sign;
  tone?: Tone;
  currency?: boolean;
  decimals?: 0 | 2;
  className?: string;
}

const SIGN_GLYPH: Record<Exclude<Sign, 'none' | 'auto'>, string> = {
  positive: '+',
  negative: '−',
  up: '↑',
  down: '↓',
};

const TONE_COLOR: Record<Exclude<Tone, 'neutral' | 'auto'>, string> = {
  income: 'var(--primary)',
  expense: 'var(--danger)',
};

export default function Money({
  value,
  sign = 'none',
  tone = 'neutral',
  currency = true,
  decimals = 2,
  className,
}: MoneyProps) {
  const { valuesHidden } = usePrivacy();

  const usesAbs = sign !== 'none';
  const numeric = usesAbs ? Math.abs(value) : value;
  const formatted = decimals === 0 ? formatBRLCompact(numeric) : formatBRL(numeric);

  const mask = decimals === 0 ? '•••.•••' : '•••.•••,••';

  const resolvedSign: string | null = (() => {
    if (valuesHidden || sign === 'none') return null;
    if (sign === 'auto') return value >= 0 ? '+' : '−';
    return SIGN_GLYPH[sign];
  })();

  const color = (() => {
    if (valuesHidden || tone === 'neutral') return undefined;
    if (tone === 'auto') return value >= 0 ? 'var(--primary)' : 'var(--danger)';
    return TONE_COLOR[tone];
  })();

  return (
    <span
      className={`money${valuesHidden ? ' is-hidden' : ''}${className ? ` ${className}` : ''}`}
      style={color ? { color } : undefined}
      aria-label={valuesHidden ? 'valor oculto' : undefined}
    >
      {resolvedSign && <span className="money-sign">{resolvedSign} </span>}
      {currency && <span className="money-currency">R$ </span>}
      <span className="money-amount">{valuesHidden ? mask : formatted}</span>
    </span>
  );
}
