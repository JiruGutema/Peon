'use client';

import { type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-[11px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-[12.5px] font-semibold">{value ?? '-'}</span>
    </div>
  );
}

export function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-[11px]">{label}</p>
      <div className="text-[12.5px]">{children}</div>
    </div>
  );
}

export function Field({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <Label className="truncate">{label}</Label>
        {tooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={`About ${label}`}
                >
                  <CircleHelp className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ToggleField({
  label,
  tooltip,
  checked,
  onCheckedChange,
}: {
  label: string;
  tooltip?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-border-bright flex h-10 items-center justify-between gap-4 rounded-md border px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <Label className="truncate">{label}</Label>
        {tooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={`About ${label}`}
                >
                  <CircleHelp className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <Switch className="shrink-0" checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
