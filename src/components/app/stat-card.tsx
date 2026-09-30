import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div className={cn('bg-card border-border rounded-lg border p-4 transition-colors', href && 'hover:bg-secondary', className)}>
      <div className="text-muted-foreground flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        {Icon ? <Icon className="size-4" /> : null}
      </div>
      <div className="text-display mt-2 font-mono font-semibold tracking-tight">{value}</div>
      {hint ? <p className="text-muted-foreground mt-1 text-sm">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
