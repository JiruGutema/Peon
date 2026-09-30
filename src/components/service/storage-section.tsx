'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listVolumes, createVolume, deleteVolume } from '@/services/api/service';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';

export function StorageSection({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const { data: volumes } = useQuery({
    queryKey: ['volumes', serviceId],
    queryFn: () => listVolumes(serviceId),
  });
  const [name, setName] = useState('');
  const [mountPath, setMountPath] = useState('');
  const invalidate = () => qc.invalidateQueries({ queryKey: ['volumes', serviceId] });

  const addMut = useMutation({
    mutationFn: () => createVolume(serviceId, { name, mountPath }),
    onSuccess: async () => {
      await invalidate();
      setName('');
      setMountPath('');
      toast.success('Volume added');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteVolume(serviceId, id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <Panel
        title="add persistent volume"
        contentClassName="flex gap-2 p-4"
        footer={
          <Button size="sm" onClick={() => addMut.mutate()} disabled={!name || !mountPath || addMut.isPending}>
            Add volume
          </Button>
        }
      >
          <Input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="/data" value={mountPath} onChange={(e) => setMountPath(e.target.value)} />
      </Panel>
      <Panel contentClassName="divide-y">
        {volumes?.length ? (
          volumes.map((v) => (
            <div key={v.id} className="hover:bg-secondary flex items-center justify-between gap-4 px-4 py-3 text-[12.5px] transition-colors">
              <span className="font-mono">
                {v.name} → {v.mountPath}
              </span>
              <ConfirmButton
                onConfirm={() => delMut.mutate(v.id)}
                title={`Delete volume ${v.name}?`}
                description="The volume mapping is removed from the service configuration. Data on the server is not deleted automatically."
              >
                <Trash2 className="size-4" /> Delete
              </ConfirmButton>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground p-6 text-center text-[12.5px]">no volumes.</div>
        )}
      </Panel>
    </div>
  );
}
