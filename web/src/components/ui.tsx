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

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
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
