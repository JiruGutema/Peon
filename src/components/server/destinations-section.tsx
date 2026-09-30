"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Panel } from "@/components/app/page"
import { Callout } from "@/components/app/callout"
import { ConfirmButton } from "@/components/app/confirm"
import {
  createDestination,
  deleteDestination,
  type ServerDetail,
} from "@/services/api/server"

export function DestinationsSection({
  server,
  onChanged,
}: {
  server: ServerDetail
  onChanged: () => void
}) {
  const [name, setName] = useState("")
  const [network, setNetwork] = useState("peon")

  const createMut = useMutation({
    mutationFn: () => createDestination(server.id, { name, network }),
    onSuccess: async () => {
      onChanged()
      setName("")
      setNetwork("peon")
      toast.success("Destination added")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  })

  const deleteMut = useMutation({
    mutationFn: (destId: string) => deleteDestination(server.id, destId),
    onSuccess: async () => {
      onChanged()
      toast.success("Destination deleted")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  })

  return (
    <div className="space-y-4">
      <Callout title="What is a destination?">
        <p>
          A destination is a Docker network on this server where your apps are
          deployed. The server is the machine; the destination is which network
          those containers join so they can talk to each other and to the
          traffic gateway.
        </p>
        <p>
          Every server starts with a{" "}
          <span className="font-medium text-foreground">default</span>{" "}
          destination (network{" "}
          <span className="font-mono text-[11px] text-foreground">peon</span>).
          Add another if you need an isolated network for a separate set of
          services.
        </p>
        <div className="rounded-md border border-phosphor-dim/60 bg-background/40 px-3 py-2.5">
          <div className="mb-1 text-[10px] font-medium tracking-wide text-phosphor uppercase">
            Example
          </div>
          <p>
            Deploy your marketing site and API on the{" "}
            <span className="font-medium text-foreground">default</span>{" "}
            destination so they share the{" "}
            <span className="font-mono text-[11px]">peon</span> network with the
            gateway. Create a second destination named{" "}
            <span className="font-medium text-foreground">staging</span> with
            network <span className="font-mono text-[11px]">peon-staging</span>{" "}
            for preview apps that should stay isolated from production
            containers on the same server.
          </p>
        </div>
      </Callout>

      <Panel
        title="add destination"
        contentClassName="grid gap-4 p-4 sm:grid-cols-2"
        footer={
          <Button
            size="sm"
            onClick={() => createMut.mutate()}
            disabled={!name || createMut.isPending}
          >
            Add
          </Button>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="d-name">Name</Label>
          <Input
            id="d-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. staging"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-network">Docker network</Label>
          <Input
            id="d-network"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            placeholder="peon"
          />
        </div>
      </Panel>

      {server.destinations.length ? (
        <Panel title="destinations" contentClassName="divide-y">
          {server.destinations.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary"
            >
              <div>
                <div className="text-[12.5px] font-semibold">{d.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  network: {d.network}
                </div>
              </div>
              <ConfirmButton
                title={`Delete destination "${d.name}"?`}
                description={`Removes this destination (Docker network ${d.network}) from Peon. Services still using it may need to be reassigned.`}
                confirmLabel="Delete"
                size="sm"
                disabled={deleteMut.isPending}
                onConfirm={() => deleteMut.mutate(d.id)}
              >
                <Trash2 className="size-4" /> Delete
              </ConfirmButton>
            </div>
          ))}
        </Panel>
      ) : (
        <p className="rounded-lg border border-dashed border-border-bright px-4 py-8 text-center text-[12.5px] text-muted-foreground">
          No destinations yet.
        </p>
      )}
    </div>
  )
}
