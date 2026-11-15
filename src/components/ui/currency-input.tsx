import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './input';

/**
 * Money field with thousand separators while typing (Indonesian style: 1.500.000).
 *
 * Data flow: the parent keeps the RAW numeric string ("1500000", or "1500000.5" with decimals), so existing
 * validation and Number() conversions are unchanged. Only the displayed text is formatted.
 * In the typed text a dot is a thousands separator and a comma is the decimal mark.
 */

/** "1500000.5" -> "1.500.000,5" */
export function formatCurrencyInput(raw: string): string {
  if (raw === '' || !/^\d*(\.\d*)?$/.test(raw)) return raw;
  const [integer, fraction] = raw.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

/** "1.500.000,5" -> "1500000.5" (letters and symbols are dropped, leading zeros trimmed) */
export function parseCurrencyInput(text: string): string {
  const [integerPart, ...rest] = text.replace(/[^\d,]/g, '').split(',');
  const integer = integerPart.replace(/^0+(?=\d)/, '').slice(0, 15);
  if (rest.length === 0) return integer;
  return `${integer === '' ? '0' : integer}.${rest.join('').slice(0, 2)}`;
}

export interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  /** Raw numeric string, e.g. "1500000" */
  value: string;
  onValueChange: (raw: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    const caretRef = React.useRef<number | null>(null);
    const [, rerender] = React.useReducer((n: number) => n + 1, 0);

    // Re-formatting changes the text length, so put the caret back next to the digit the user was editing.
    React.useLayoutEffect(() => {
      const el = innerRef.current;
      if (caretRef.current !== null && el && document.activeElement === el) {
        el.setSelectionRange(caretRef.current, caretRef.current);
      }
      caretRef.current = null;
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const typed = e.target.value;
      const caret = e.target.selectionStart ?? typed.length;
      const raw = parseCurrencyInput(typed);
      const formatted = formatCurrencyInput(raw);

      // Caret = after the same number of digits/commas that were left of it in the typed text.
      const wanted = typed.slice(0, caret).replace(/[^\d,]/g, '').length;
      let seen = 0;
      let position = 0;
      while (position < formatted.length && seen < wanted) {
        if (/[\d,]/.test(formatted[position])) seen += 1;
        position += 1;
      }
      caretRef.current = position;

      onValueChange(raw);
      rerender(); // also restores the text when the raw value did not change (e.g. a letter was typed)
    }

    return (
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted-foreground"
          aria-hidden="true"
        >
          Rp
        </span>
        <Input
          {...props}
          ref={innerRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={formatCurrencyInput(value)}
          onChange={handleChange}
          className={cn('pl-11', className)}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
