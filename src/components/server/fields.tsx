"use client"

import { ChevronRight, Terminal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function MetricCard({
  label,
  value,
  detail,
  pct,
  invert,
}: {
  label: string
  value: string
  detail: string
  pct: number
  /** When true, higher free % is good (green bias). */
  invert?: boolean
}) {
  const tone = invert
    ? pct < 15
      ? "bg-destructive"
      : pct < 30
        ? "bg-amber-500"
        : "bg-phosphor"
    : pct >= 90
      ? "bg-destructive"
      : pct >= 75
        ? "bg-amber-500"
        : "bg-phosphor"

  return (
    <div className="rounded-lg border border-border/80 bg-card px-3 py-3">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold tracking-tight">
        {value}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">{detail}</div>
    </div>
  )
}

const CONNECTION_TONE = {
  success: {
    card: "border-success/25 bg-success/5",
    icon: "bg-success/15 text-success",
    label: "text-success",
  },
  warning: {
    card: "border-warning/25 bg-warning/5",
    icon: "bg-warning/15 text-warning",
    label: "text-warning",
  },
  destructive: {
    card: "border-destructive/25 bg-destructive/5",
    icon: "bg-destructive/15 text-destructive",
    label: "text-destructive",
  },
  muted: {
    card: "border-border/70 bg-secondary/40",
    icon: "bg-muted text-muted-foreground",
    label: "text-muted-foreground",
  },
} as const

export function ConnectionStep({
  icon: Icon,
  label,
  status,
  about,
  tone,
}: {
  icon: typeof Terminal
  label: string
  status: string
  about: string
  tone: keyof typeof CONNECTION_TONE
}) {
  const styles = CONNECTION_TONE[tone]
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-start gap-2.5 rounded-md border px-2.5 py-2",
        styles.card
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          styles.icon
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
        <div
          className={cn(
            "text-[12.5px] leading-tight font-semibold",
            styles.label
          )}
        >
          {status}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {about}
        </p>
      </div>
    </div>
  )
}

export function ConnectionStepConnector() {
  return (
    <div
      className="hidden shrink-0 items-center text-muted-foreground/40 sm:flex"
      aria-hidden
    >
      <ChevronRight className="size-4" />
    </div>
  )
}

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  compact,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        compact ? "py-0" : "px-4 py-3"
      )}
    >
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold">{label}</div>
        {description ? (
          <div className="text-[11px] text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
