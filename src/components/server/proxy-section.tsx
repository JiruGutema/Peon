"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/app/page"
import { StatusBadge } from "@/components/app/status-badge"
import { proxyAction, type ServerDetail } from "@/services/api/server"

export function ProxySection({
  server,
  onChanged,
}: {
  server: ServerDetail
  onChanged: () => void
}) {
  const actionMut = useMutation({
    mutationFn: (action: "start" | "stop" | "restart") =>
      proxyAction(server.id, action),
    onSuccess: async (_res, action) => {
      onChanged()
      const label =
        action === "stop"
          ? "Turning off gateway"
          : action === "restart"
            ? "Reloading gateway"
            : "Turning on gateway"
      toast.success(`${label}. Watch activity for live logs.`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  })

  const gatewayName =
    server.proxyType === "CADDY"
      ? "Caddy"
      : server.proxyType === "NONE"
        ? null
        : "Traefik"
  const isOn = server.proxyStatus === "running"

  return (
    <div className="space-y-4">
      <Panel
        title="traffic gateway"
        contentClassName="space-y-4 p-4"
        footer={
          server.proxyType !== "NONE" ? (
            <>
              <Button
                size="sm"
                onClick={() => actionMut.mutate("start")}
                disabled={actionMut.isPending || isOn}
              >
                Turn on
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => actionMut.mutate("restart")}
                disabled={actionMut.isPending || !isOn}
              >
                Reload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => actionMut.mutate("stop")}
                disabled={actionMut.isPending || !isOn}
              >
                Turn off
              </Button>
            </>
          ) : undefined
        }
      >
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {gatewayName
            ? `The gateway (${gatewayName}) receives public HTTPS traffic and routes each domain to the right app container. Peon installs and manages it on this server.`
            : "No gateway is configured for this server. Change Gateway type under General if you want public HTTPS routing."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Status</span>
          <StatusBadge
            status={
              isOn
                ? "on"
                : server.proxyStatus === "exited"
                  ? "off"
                  : server.proxyStatus
            }
            tone={isOn ? "success" : "muted"}
          />
          {gatewayName ? (
            <span className="text-[11px] text-muted-foreground">
              {gatewayName}
            </span>
          ) : null}
        </div>

        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground/80">Turn on</span> —
            install/start the gateway so domains can reach your apps.
          </p>
          <p>
            <span className="font-medium text-foreground/80">Reload</span> —
            restart the gateway with the current config (brief blip possible).
          </p>
          <p>
            <span className="font-medium text-foreground/80">Turn off</span> —
            stop public routing on this server (apps keep running locally).
          </p>
        </div>
      </Panel>
    </div>
  )
}
