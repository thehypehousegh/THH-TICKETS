import { useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles: Record<string, string> = {
    primary: 'text-white shadow-lg shadow-accent/25 hover:brightness-110 hover:shadow-xl hover:shadow-hot/25 hover:-translate-y-0.5',
    secondary: 'bg-surface-hi text-text hover:bg-white/10 border border-divider',
    danger: 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30',
    ghost: 'text-text-dim hover:text-text',
  };
  const gradientStyle = variant === 'primary' ? { backgroundImage: 'var(--gradient-brand)' } : undefined;
  return <button className={`${base} ${styles[variant]} ${className}`} style={{ ...gradientStyle, ...style }} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`w-full rounded-lg border border-divider bg-surface px-3 py-2.5 pr-10 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none ${props.className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-text-dim hover:text-text"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83M9.88 4.24A9.5 9.5 0 0112 4c5 0 9 4 10 8-.32 1.1-.86 2.16-1.56 3.12M6.53 6.53C4.6 7.8 3.1 9.7 2 12c1 4 5 8 10 8 1.35 0 2.63-.28 3.78-.78" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-left ${className}`}>
      <span className="text-xs font-medium text-text-dim">{label}</span>
      {children}
    </label>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-divider bg-surface/80 p-4 shadow-lg shadow-black/20 backdrop-blur-sm ${className}`}>{children}</div>;
}

export function Tag({ children, variant = 'outline' }: { children: ReactNode; variant?: 'outline' | 'accent' | 'good' | 'hot' | 'warm' }) {
  const styles: Record<string, string> = {
    outline: 'border border-divider text-text-dim',
    accent: 'bg-accent/20 text-accent2 border border-accent/40',
    good: 'bg-good/20 text-good border border-good/40',
    hot: 'bg-hot/20 text-hot border border-hot/40',
    warm: 'bg-warm/20 text-warm border border-warm/40',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[variant]}`}>{children}</span>;
}
