import * as React from 'react';
import { cn } from '@/lib/utils';

export { PageHeader } from './page-header';
export { Panel } from './panel';
export { FormField, FormSection } from './form-section';
export { KeyValueList } from './key-value-list';

/** Full-width page wrapper with consistent vertical rhythm. */
export function PageContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('min-w-0 w-full space-y-6', className)}>{children}</div>;
}

/** @deprecated Migrate to Panel. Removed in Task 14. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title ? <h2 className="text-md font-medium">{title}</h2> : null}
            {description ? <p className="text-muted-foreground mt-0.5 text-sm">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
