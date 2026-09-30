"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Activity, HardDrive, KeyRound, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Panel } from "@/components/app/page"
import { LocalDateTime } from "@/components/app/local-datetime"
import {
  updateServer,
  validateServer,
  type ServerDetail,
} from "@/services/api/server"
import { listPrivateKeys } from "@/services/api/privatekey"
import { useAuthStore } from "@/store/auth"
import {
  ConnectionStep,
  ConnectionStepConnector,
  MetricCard,
} from "@/components/server/fields"

export function GeneralSection({
  server,
  onSaved,
}: {
  server: ServerDetail
  onSaved: () => void
}) {
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId)
  const [name, setName] = useState(server.name)
  const [description, setDescription] = useState(server.description ?? "")
  const [ip, setIp] = useState(server.ip)
  const [port, setPort] = useState(String(server.port))
  const [user, setUser] = useState(server.user)
  const [privateKeyId, setPrivateKeyId] = useState(server.privateKeyId ?? "")
  const [wildcardDomain, setWildcardDomain] = useState(
    server.settings?.wildcardDomain ?? ""
  )
  const [proxyType, setProxyType] = useState(server.proxyType)
  const [connectionTimeout, setConnectionTimeout] = useState(
    String(server.settings?.connectionTimeout ?? 30)
  )

  const { data: keys } = useQuery({
    queryKey: ["private-keys", workspaceId],
    queryFn: () => listPrivateKeys(workspaceId!),
    enabled: !!workspaceId,
  })

  const saveMut = useMutation({
    mutationFn: () =>
      updateServer(server.id, {
        name,
        description: description || null,
        ip,
        port: Number(port) || 22,
        user,
        privateKeyId: privateKeyId || null,
        proxyType,
        wildcardDomain: wildcardDomain || null,
        connectionTimeout: Number(connectionTimeout) || 30,
      }),
    onSuccess: async () => {
      onSaved()
      toast.success("Server updated")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const forgetHostKeyMut = useMutation({
    mutationFn: () => updateServer(server.id, { hostKeyFingerprint: null }),
    onSuccess: async () => {
      onSaved();
      toast.success('Trusted host key cleared — it is recorded again on the next connection.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const connectMut = useMutation({
    mutationFn: () =>
      validateServer(server.id, {
        ip,
        port: Number(port) || 22,
        user,
        privateKeyId: privateKeyId || null,
        connectionTimeout: Number(connectionTimeout) || 30,
      }),
    onSuccess: () => {
      onSaved()
      toast.success(
        server.isUsable
          ? "Reconnect to server started. Watch activity for live logs."
          : "Connect to server started. Watch activity for live logs."
      )
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  })

  const metrics = server.settings?.agentHostMetrics
  const agentLive = server.settings?.isAgentLive === true
  const cpu = metrics?.cpu_percent
  const mem = metrics?.memory_percent
  const disk = metrics?.disk_percent_root
  const free = disk != null ? Math.max(0, 100 - disk) : null
  const containerCount = server.settings?.agentContainers?.length
  const proxyTypeChanged = proxyType !== server.proxyType
  const proxySwitchBlocked =
    proxyTypeChanged && server.proxyStatus === "running"

  return (
    <div className="space-y-5">
      <div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="CPU"
            value={cpu != null ? `${Math.round(cpu)}%` : "—"}
            detail={agentLive ? "from peon-ping-pong" : "waiting for agent"}
            pct={cpu ?? 0}
          />
          <MetricCard
            label="RAM"
            value={mem != null ? `${Math.round(mem)}%` : "—"}
            detail={agentLive ? "from peon-ping-pong" : "waiting for agent"}
            pct={mem ?? 0}
          />
          <MetricCard
            label="Disk used"
            value={disk != null ? `${Math.round(disk)}%` : "—"}
            detail={
              agentLive
                ? containerCount != null
                  ? `${containerCount} containers`
                  : "from peon-ping-pong"
                : "waiting for agent"
            }
            pct={disk ?? 0}
          />
          <MetricCard
            label="Free space"
            value={free != null ? `${Math.round(free)}%` : "—"}
            detail={agentLive ? "root filesystem" : "waiting for agent"}
            pct={free ?? 0}
            invert
          />
        </div>
      </div>

      <Panel
        title="connection"
        contentClassName="space-y-3 p-3"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {connectMut.isPending
                ? "Saving & connecting…"
                : "Saves host settings, then connects · progress in Activity"}
            </span>
            <Button
              size="sm"
              onClick={() => connectMut.mutate()}
              disabled={connectMut.isPending || !privateKeyId}
            >
              {server.isReachable ? "Reconnect to server" : "Connect to server"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <ConnectionStep
            icon={Terminal}
            label="SSH"
            status={server.isReachable ? "Online" : "Offline"}
            about={
              server.isReachable
                ? "Session to this host works."
                : "Check IP, port, and key."
            }
            tone={server.isReachable ? "success" : "destructive"}
          />
          <ConnectionStepConnector />
          <ConnectionStep
            icon={HardDrive}
            label="Setup"
            status={server.isUsable ? "Ready" : "Needed"}
            about={
              server.isUsable
                ? "Docker ready for deploys."
                : "Connect to finish install."
            }
            tone={server.isUsable ? "success" : "muted"}
          />
          <ConnectionStepConnector />
          <ConnectionStep
            icon={Activity}
            label="Agent"
            status={
              agentLive
                ? "Live"
                : server.settings?.isSentinelEnabled
                  ? "Waiting"
                  : "Not installed"
            }
            about={
              agentLive
                ? "Sending host metrics."
                : server.settings?.isSentinelEnabled
                  ? "No recent heartbeat."
                  : "Installs on Connect."
            }
            tone={
              agentLive
                ? "success"
                : server.settings?.isSentinelEnabled
                  ? "warning"
                  : "muted"
            }
          />
        </div>
        <div className="flex items-center gap-2 border-t border-dashed pt-2.5 text-[11px] text-muted-foreground">
          <Activity className="size-3 shrink-0 opacity-60" />
          <span>
            Last heartbeat{" "}
            <span className="font-medium text-foreground/85 tabular-nums">
              {server.settings?.agentLastSeenAt ? (
                <LocalDateTime value={server.settings.agentLastSeenAt} />
              ) : (
                "—"
              )}
            </span>
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 border-t border-dashed pt-2.5 text-[11px]">
          <KeyRound className="size-3 shrink-0 opacity-60" />
          <span className="min-w-0">
            Trusted host key{' '}
            {server.hostKeyFingerprint ? (
              <span className="text-foreground/85 font-mono break-all">
                {server.hostKeyFingerprint}
              </span>
            ) : (
              <span className="text-foreground/85">
                not set — recorded on the next connection
              </span>
            )}
          </span>
          {server.hostKeyFingerprint ? (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-6 px-2 text-[11px]"
              onClick={() => forgetHostKeyMut.mutate()}
              disabled={forgetHostKeyMut.isPending}
            >
              Forget
            </Button>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="general"
        contentClassName="grid gap-4 p-4 sm:grid-cols-2"
        footer={
          <Button
            size="sm"
            onClick={() => {
              if (proxySwitchBlocked) {
                toast.error(
                  "Current gateway is running. Turn it off first, then change gateway type."
                )
                return
              }
              saveMut.mutate()
            }}
            disabled={!privateKeyId || saveMut.isPending}
          >
            Save changes
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="g-name">Name</Label>
          <Input
            id="g-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-description">Description</Label>
          <Input
            id="g-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-user">User</Label>
          <Input
            id="g-user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-ip">IP / Hostname</Label>
          <Input
            id="g-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="203.0.113.10, 2001:db8::1, or host.example.com"
          />
          <p className="text-[11px] text-muted-foreground">
            IPv4, IPv6, or DNS hostname — passed straight to SSH.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-port">Port</Label>
          <Input
            id="g-port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>SSH key</Label>
          <SearchableSelect
            value={privateKeyId}
            onValueChange={setPrivateKeyId}
            placeholder="Select SSH key"
            options={[
              ...(keys ?? []).map((k) => ({ value: k.id, label: k.name })),
              ...(privateKeyId &&
              !keys?.some((k) => k.id === privateKeyId) &&
              server.privateKey
                ? [
                    {
                      value: server.privateKey.id,
                      label: server.privateKey.name,
                    },
                  ]
                : []),
            ]}
          />
          {!keys?.length ? (
            <p className="text-[11px] text-muted-foreground">
              No SSH keys yet.{" "}
              <Link
                href="/keys-and-tokens"
                className="text-phosphor underline-offset-2 hover:underline"
              >
                Add one under Keys & Tokens
              </Link>
              .
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-wildcard">Wildcard domain</Label>
          <Input
            id="g-wildcard"
            placeholder="https://example.com"
            value={wildcardDomain}
            onChange={(e) => setWildcardDomain(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-timeout">SSH connection timeout (s)</Label>
          <Input
            id="g-timeout"
            value={connectionTimeout}
            onChange={(e) => setConnectionTimeout(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Gateway type</Label>
          <SearchableSelect
            value={proxyType}
            onValueChange={(v) => setProxyType(v as ServerDetail["proxyType"])}
            placeholder="Select gateway type"
            options={[
              { value: "TRAEFIK", label: "Traefik" },
              { value: "CADDY", label: "Caddy" },
              { value: "NONE", label: "None" },
            ]}
          />
          <p className="text-[11px] text-muted-foreground">
            Reverse proxy Peon installs on this server to route public HTTPS to
            your apps. Choose <span className="text-foreground/80">None</span>{" "}
            if you only need SSH / private networks.
          </p>
        </div>
      </Panel>
    </div>
  )
}
