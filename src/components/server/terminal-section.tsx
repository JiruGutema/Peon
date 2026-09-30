"use client"

import { SshTerminal } from "@/components/terminal/ssh-terminal"

export function TerminalSection({ serverId }: { serverId: string }) {
  return <SshTerminal serverId={serverId} />
}
