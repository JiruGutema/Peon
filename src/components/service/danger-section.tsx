'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, TriangleAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { deleteService } from '@/services/api/service';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DangerSection({
  serviceId,
  projectId,
  name,
}: {
  serviceId: string;
  projectId: string;
  name: string;
}) {
  const [confirm, setConfirm] = useState('');
  const delMut = useMutation({
    mutationFn: () => deleteService(serviceId),
    onSuccess: () => {
      toast.success('Service deleted');
      window.location.href = `/projects/${projectId}`;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <Panel
      title={<span className="text-destructive">delete service</span>}
      className="border-destructive/40"
      contentClassName="space-y-3 p-4"
      footer={
        <ConfirmButton
          onConfirm={() => delMut.mutate()}
          title={`Delete service "${name}"?`}
          description={
            <div className="space-y-3">
              <p>
                This permanently deletes the service, its configuration, environment variables, and
                deployment history from Peon.
              </p>
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                It also stops and removes this app on the server, including Docker volumes. That
                data cannot be recovered. Use Stop or Suspend if you only want to pause it.
              </p>
            </div>
          }
          confirmLabel="Delete permanently"
          size="sm"
          disabled={confirm !== name || delMut.isPending}
        >
          <Trash2 className="size-4" /> Delete permanently
        </ConfirmButton>
      }
    >
      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50">
        <TriangleAlert />
        <AlertTitle>This cannot be undone</AlertTitle>
        <AlertDescription className="text-amber-900/85 dark:text-amber-100/80">
          Delete stops this app on the server and removes its Docker volumes (databases, uploads).
          Use Stop or Suspend if you only want to pause it. If the server is unreachable, Peon still
          removes the service from your account.
        </AlertDescription>
      </Alert>
      <p className="text-muted-foreground text-sm">
        This permanently deletes the service and its configuration. Type <b>{name}</b> to confirm.
      </p>
      <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={name} />
    </Panel>
  );
}
