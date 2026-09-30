'use client';

import { SshTerminal } from '@/components/terminal/ssh-terminal';

export function TerminalSection({ serviceId }: { serviceId: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SshTerminal serviceId={serviceId} className="min-h-0 flex-1" />
    </div>
  );
}
