'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  listBackups,
  createBackup,
  updateBackup,
  deleteBackup,
  runBackupNow,
  listBackupExecutions,
  restoreBackup,
  downloadBackup,
  type ScheduledBackupItem,
} from '@/services/api/service';
import { listStorages } from '@/services/api/storages';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { LocalDateTime } from '@/components/app/local-datetime';
import { useAuthStore } from '@/store/auth';

export function BackupsSection({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const workspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const { data: backups } = useQuery({
    queryKey: ['backups', serviceId],
    queryFn: () => listBackups(serviceId),
    refetchInterval: 10_000,
  });
  const { data: storages } = useQuery({
    queryKey: ['storages', workspaceId],
    queryFn: () => listStorages(workspaceId!),
    enabled: !!workspaceId,
  });
  const [frequency, setFrequency] = useState('0 0 * * *');
  const [dumpAll, setDumpAll] = useState(true);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['backups', serviceId] });

  const addMut = useMutation({
    mutationFn: () => createBackup(serviceId, { frequency, dumpAll }),
    onSuccess: async () => {
      await invalidate();
      toast.success('Backup schedule created');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="space-y-4">
      <Panel
        title="new backup schedule"
        contentClassName="space-y-3 p-4"
        footer={
          <Button size="sm" onClick={() => addMut.mutate()} disabled={!frequency || addMut.isPending}>
            Add backup schedule
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="backup-freq">Frequency (cron)</Label>
            <Input
              id="backup-freq"
              className="font-mono"
              placeholder="0 0 * * *"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
            <p className="text-muted-foreground text-[11px]">
              Logical dumps are stored on the server and can be downloaded or restored from previous runs.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Backup scope</Label>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={dumpAll} onCheckedChange={setDumpAll} id="backup-dump-all" />
              <Label htmlFor="backup-dump-all" className="font-normal text-[12.5px]">
                Entire instance (all databases)
              </Label>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {dumpAll
                ? 'Uses pg_dumpall / --all-databases so every database in this service is included.'
                : 'Dumps only the configured database name for this service.'}
            </p>
          </div>
        </div>
      </Panel>

      {backups?.length ? (
        backups.map((b) => (
          <BackupEditor
            key={b.id}
            serviceId={serviceId}
            backup={b}
            storages={storages ?? []}
          />
        ))
      ) : (
        <Panel contentClassName="p-6">
          <div className="text-muted-foreground text-center text-[12.5px]">
            no backup schedules. add one above to protect this database.
          </div>
        </Panel>
      )}
    </div>
  );
}

function BackupEditor({
  serviceId,
  backup,
  storages,
}: {
  serviceId: string;
  backup: ScheduledBackupItem;
  storages: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const val = <T,>(k: keyof ScheduledBackupItem, fallback: T): T =>
    (form[k as string] as T) ?? ((backup[k] as T) ?? fallback);
  const dirty = Object.keys(form).length > 0;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['backups', serviceId] });

  const saveMut = useMutation({
    mutationFn: () => updateBackup(serviceId, backup.id, form),
    onSuccess: async () => {
      await invalidate();
      setForm({});
      toast.success('Backup schedule saved');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const toggleMut = useMutation({
    mutationFn: () => updateBackup(serviceId, backup.id, { enabled: !backup.enabled }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const runMut = useMutation({
    mutationFn: () => runBackupNow(serviceId, backup.id),
    onSuccess: async () => {
      await invalidate();
      await qc.invalidateQueries({ queryKey: ['backup-executions', backup.id] });
      toast.success('Backup queued - check executions shortly');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const delMut = useMutation({
    mutationFn: () => deleteBackup(serviceId, backup.id),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const saveS3 = val('saveS3', false);
  const dumpAll = val('dumpAll', true);

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2 font-mono">
          {backup.frequency}
          {!backup.enabled && <Badge variant="outline" className="text-[10px]">disabled</Badge>}
          {backup.dumpAll ? (
            <Badge variant="outline" className="text-[10px]">all dbs</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">single db</Badge>
          )}
          {backup.saveS3 && <Badge variant="outline" className="text-[10px]">S3</Badge>}
        </span>
      }
      contentClassName="space-y-4 p-4"
      footer={
        <>
          <ConfirmButton
            onConfirm={() => delMut.mutate()}
            title="Delete backup schedule?"
            description="The schedule and its execution history will be removed. Existing dump files on the server are not deleted."
            disabled={delMut.isPending}
            className="mr-auto"
          >
            <Trash2 className="size-3.5" /> Delete
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}>
            {backup.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            <Play className="size-3.5" /> Backup now
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Frequency (cron)</Label>
          <Input
            className="font-mono"
            value={val('frequency', '')}
            onChange={(e) => set('frequency', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Local backups to keep</Label>
          <Input
            type="number"
            value={String(val('retentionAmountLocal', 7))}
            onChange={(e) => set('retentionAmountLocal', Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Entire instance</Label>
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={dumpAll} onCheckedChange={(c) => set('dumpAll', c)} />
            <span className="text-muted-foreground text-[11px]">
              {dumpAll ? 'all databases' : 'configured DB only'}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Upload to S3</Label>
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={saveS3} onCheckedChange={(c) => set('saveS3', c)} />
            {saveS3 && (
              <SearchableSelect
                value={val('s3StorageId', '') ?? ''}
                onValueChange={(v) => set('s3StorageId', v)}
                placeholder="Select S3 storage"
                className="flex-1"
                options={storages.map((s) => ({ value: s.id, label: s.name }))}
              />
            )}
          </div>
          {saveS3 && storages.length === 0 && (
            <p className="text-muted-foreground text-[11px]">No S3 storages configured - add one under Storages.</p>
          )}
        </div>
      </div>

      <BackupExecutions serviceId={serviceId} backup={backup} />
    </Panel>
  );
}

function formatBackupSize(size: string | null): string | null {
  if (!size) return null;
  const n = Number(size);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function BackupExecutions({ serviceId, backup }: { serviceId: string; backup: ScheduledBackupItem }) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['backup-executions', backup.id],
    queryFn: ({ pageParam }) =>
      listBackupExecutions(serviceId, backup.id, {
        limit: 5,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 5000,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const restoreMut = useMutation({
    mutationFn: (filename: string) => restoreBackup(serviceId, filename),
    onSuccess: () => toast.success('Restore queued - the worker will apply it shortly'),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Restore failed'),
  });

  const downloadMut = useMutation({
    mutationFn: (filename: string) => downloadBackup(serviceId, filename),
    onSuccess: () => toast.success('Download started'),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Download failed'),
  });

  return (
    <div className="space-y-2 text-[11px]">
      <div className="text-muted-foreground font-medium tracking-wide uppercase">
        Previous backups ({backup._count.executions})
      </div>
      <div className="space-y-1.5">
        {isLoading && items.length === 0 ? (
          <div className="text-muted-foreground">loading…</div>
        ) : items.length ? (
          <>
            {items.map((e) => (
              <div key={e.id} className="bg-secondary/50 rounded-md px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={e.status === 'SUCCESS' ? 'text-phosphor' : e.status === 'FAILED' ? 'text-destructive' : ''}>
                    {e.status.toLowerCase()}
                    {e.dumpAll ? ' · all dbs' : e.databaseName ? ` · ${e.databaseName}` : ''}
                    {e.s3Uploaded ? ' · s3' : ''}
                    {formatBackupSize(e.size) ? ` · ${formatBackupSize(e.size)}` : ''}
                  </span>
                  <span className="text-muted-foreground">
                    <LocalDateTime value={e.startedAt} />
                  </span>
                </div>
                {e.filename && (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate font-mono text-[10.5px]">{e.filename}</span>
                    {e.status === 'SUCCESS' && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadMut.isPending}
                          onClick={() => downloadMut.mutate(e.filename!)}
                        >
                          <Download className="size-3.5" /> Download
                        </Button>
                        <ConfirmButton
                          onConfirm={() => restoreMut.mutate(e.filename!)}
                          title="Queue restore of this backup?"
                          description={
                            e.dumpAll
                              ? 'The restore will be queued and applied by the worker. All databases in this instance may be overwritten. This cannot be undone.'
                              : 'The restore will be queued and applied by the worker. Existing data in the database may be overwritten. This cannot be undone.'
                          }
                          confirmLabel="Queue restore"
                          variant="outline"
                          confirmVariant="default"
                          size="sm"
                          disabled={restoreMut.isPending}
                        >
                          Restore
                        </ConfirmButton>
                      </div>
                    )}
                  </div>
                )}
                {e.message && (
                  <pre className="text-muted-foreground mt-1 max-h-32 overflow-auto font-mono text-[10.5px] whitespace-pre-wrap">
                    {e.message}
                  </pre>
                )}
              </div>
            ))}
            {hasNextPage ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            ) : null}
          </>
        ) : (
          <div className="text-muted-foreground">no previous backups yet. run “Backup now” to create one.</div>
        )}
      </div>
    </div>
  );
}
