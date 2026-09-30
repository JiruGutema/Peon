'use client';

import { use, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  listEnv,
  upsertEnv,
  deleteEnv,
  bulkSaveEnv,
  importPreviewEnvFromProduction,
} from '@/services/api/service';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { AccessGateBanner } from '@/components/billing/access-gate-banner';
import { useCurrentWorkspaceAccess } from '@/lib/billing/workspace-access';
import { getProject } from '@/services/api/project';

export function EnvironmentSection({
  serviceId,
  projectId,
  onSettingsChanged,
}: {
  serviceId: string;
  projectId: string;
  onSettingsChanged: () => void;
}) {
  const qc = useQueryClient();
  const { data: vars } = useQuery({ queryKey: ['env', serviceId], queryFn: () => listEnv(serviceId) });
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });
  const access = useCurrentWorkspaceAccess({
    projectCanManage: project?.canManage,
  });
  // Manage requires project role + active plan. Gate before reveal/write API calls.
  const canWrite = !access.blocked && project?.canManage === true;

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['env', serviceId] }),
      qc.invalidateQueries({ queryKey: ['env-revealed', serviceId] }),
    ]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteEnv(serviceId, id),
    onSuccess: async () => {
      await invalidate();
      onSettingsChanged();
    },
  });

  const importMut = useMutation({
    mutationFn: () => importPreviewEnvFromProduction(serviceId),
    onSuccess: async (res) => {
      await invalidate();
      onSettingsChanged();
      toast.success(
        res.imported
          ? `Imported ${res.imported} production variable${res.imported === 1 ? '' : 's'} into preview`
          : 'No production variables to import',
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
  });

  const productionVars = (vars ?? []).filter((v) => !v.isPreview);
  const previewVars = (vars ?? []).filter((v) => v.isPreview);

  const onChanged = () => {
    void invalidate();
    onSettingsChanged();
  };

  return (
    <div className="space-y-4">
      {access.blocked ? <AccessGateBanner reason={access.block} /> : null}
      <EnvSection
        title="production"
        description="Used only by production deploys. The same key can exist in Preview with a different value."
        serviceId={serviceId}
        isPreview={false}
        vars={productionVars}
        canWrite={canWrite}
        onChanged={onChanged}
        onDelete={(id) => delMut.mutate(id)}
      />

      <EnvSection
        title="preview"
        description="Used only by PR preview deploys. Import from production to copy keys, then change values as needed."
        serviceId={serviceId}
        isPreview
        vars={previewVars}
        canWrite={canWrite}
        onChanged={onChanged}
        onDelete={(id) => delMut.mutate(id)}
        headerExtra={
          <ConfirmButton
            onConfirm={() => importMut.mutate()}
            title="Import from production?"
            description="Copies all production variables into the preview set and overwrites any matching preview keys. Preview deployments only use the preview set — import if you want production values as a starting point. Preview-only keys that don’t exist in production are kept."
            confirmLabel="Import"
            variant="outline"
            confirmVariant="default"
            disabled={!canWrite || importMut.isPending || productionVars.length === 0}
          >
            Import from production
          </ConfirmButton>
        }
      />
    </div>
  );
}

function EnvSection({
  title,
  description,
  serviceId,
  isPreview,
  vars,
  canWrite,
  onChanged,
  onDelete,
  headerExtra,
}: {
  title: string;
  description: string;
  serviceId: string;
  isPreview: boolean;
  vars: Array<{
    id: string;
    key: string;
    value: string;
    isPreview: boolean;
    isBuildtime: boolean;
    isRuntime: boolean;
  }>;
  canWrite: boolean;
  onChanged: () => void;
  onDelete: (id: string) => void;
  headerExtra?: ReactNode;
}) {
  const [devMode, setDevMode] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [isBuildtime, setIsBuildtime] = useState(true);
  const [isRuntime, setIsRuntime] = useState(true);
  const switchId = `dev-mode-${isPreview ? 'preview' : 'production'}`;

  const developerModeToggle = (
    <div className="flex shrink-0 items-center gap-2">
      <Label htmlFor={switchId} className="text-muted-foreground text-[12px] font-normal tracking-normal">
        Developer mode
      </Label>
      <Switch
        id={switchId}
        checked={devMode && canWrite}
        disabled={!canWrite}
        onCheckedChange={(checked) => {
          if (!canWrite) return;
          setDevMode(checked);
        }}
      />
    </div>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {headerExtra}
      {developerModeToggle}
    </div>
  );

  const addMut = useMutation({
    mutationFn: () =>
      upsertEnv(serviceId, { key, value, isBuildtime, isRuntime, isPreview }),
    onSuccess: async () => {
      setKey('');
      setValue('');
      toast.success('Saved');
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  if (devMode && canWrite) {
    return (
      <EnvDeveloperEditor
        title={title}
        serviceId={serviceId}
        isPreview={isPreview}
        canWrite={canWrite}
        actions={headerActions}
        onSaved={onChanged}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Panel
        title={title}
        actions={headerActions}
        contentClassName="space-y-3 p-4"
        footer={
          <Button
            size="sm"
            onClick={() => addMut.mutate()}
            disabled={!canWrite || !key || addMut.isPending}
          >
            Add {isPreview ? 'preview' : 'production'} variable
          </Button>
        }
      >
        <p className="text-muted-foreground text-[12px]">{description}</p>
        <div className="flex gap-2">
          <Input
            placeholder="KEY"
            value={key}
            disabled={!canWrite}
            onChange={(e) => setKey(e.target.value)}
          />
          <Input
            placeholder="value"
            value={value}
            disabled={!canWrite}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={isBuildtime} disabled={!canWrite} onCheckedChange={setIsBuildtime} /> Build
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={isRuntime} disabled={!canWrite} onCheckedChange={setIsRuntime} /> Runtime
          </label>
        </div>
      </Panel>

      <Panel contentClassName="divide-y">
        {vars.length ? (
          vars.map((v) => (
            <EnvRow
              key={v.id}
              serviceId={serviceId}
              env={v}
              canWrite={canWrite}
              showPreviewBadge={false}
              onChanged={onChanged}
              onDelete={() => onDelete(v.id)}
            />
          ))
        ) : (
          <div className="text-muted-foreground p-6 text-center text-[12.5px]">
            no {isPreview ? 'preview' : 'production'} variables.
          </div>
        )}
      </Panel>
    </div>
  );
}

/** Vercel-style inline row: masked at rest, expands into an editable form. */
function EnvRow({
  serviceId,
  env,
  canWrite,
  onChanged,
  onDelete,
  showPreviewBadge = true,
}: {
  serviceId: string;
  env: { id: string; key: string; value: string; isPreview: boolean; isBuildtime: boolean; isRuntime: boolean };
  canWrite: boolean;
  onChanged: () => void;
  onDelete: () => void;
  showPreviewBadge?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ value: string; isBuildtime: boolean; isRuntime: boolean } | null>(null);

  // Fetch decrypted values only while a row is being edited (and writes are allowed).
  const {
    data: revealed,
    isLoading: revealLoading,
  } = useQuery({
    queryKey: ['env-revealed', serviceId],
    queryFn: () => listEnv(serviceId, true),
    enabled: editing && canWrite,
  });
  const revealedValue = revealed?.find((r) => r.id === env.id)?.value;
  // Derive the edit state lazily from the revealed value; `form` only holds
  // user modifications, avoiding a setState-in-effect.
  const effective =
    form ??
    (revealedValue !== undefined
      ? { value: revealedValue, isBuildtime: env.isBuildtime, isRuntime: env.isRuntime }
      : null);

  const saveMut = useMutation({
    mutationFn: () =>
      upsertEnv(serviceId, {
        key: env.key,
        value: effective?.value ?? '',
        isPreview: env.isPreview,
        isBuildtime: effective?.isBuildtime ?? env.isBuildtime,
        isRuntime: effective?.isRuntime ?? env.isRuntime,
      }),
    onSuccess: () => {
      setEditing(false);
      setForm(null);
      onChanged();
      toast.success('Variable saved');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  if (editing && canWrite) {
    return (
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12.5px] font-medium">{env.key}</span>
          {showPreviewBadge && env.isPreview && <Badge variant="outline">preview</Badge>}
        </div>
        <Input
          className="font-mono"
          value={effective?.value ?? ''}
          placeholder={revealLoading || effective === null ? 'loading value…' : ''}
          disabled={revealLoading || effective === null}
          onChange={(e) => effective && setForm({ ...effective, value: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-4 text-[12px]">
          <label className="flex items-center gap-2">
            <Switch
              checked={effective?.isBuildtime ?? env.isBuildtime}
              onCheckedChange={(c) => effective && setForm({ ...effective, isBuildtime: c })}
            />
            Build
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={effective?.isRuntime ?? env.isRuntime}
              onCheckedChange={(c) => effective && setForm({ ...effective, isRuntime: c })}
            />
            Runtime
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm(null); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={effective === null || saveMut.isPending}>
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hover:bg-secondary flex min-w-0 items-center justify-between gap-4 px-4 py-3 text-[12.5px] transition-colors">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="shrink-0 font-mono font-medium">{env.key}</span>
        <span className="text-muted-foreground min-w-0 truncate font-mono">{env.value}</span>
        {showPreviewBadge && env.isPreview && <Badge variant="outline">preview</Badge>}
        {env.isBuildtime && <Badge variant="secondary">build</Badge>}
        {env.isRuntime && <Badge variant="secondary">runtime</Badge>}
      </div>
      {canWrite ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <ConfirmButton
            onConfirm={onDelete}
            title={`Delete ${env.key}?`}
            description="The variable will be removed from this service. A redeploy is required to apply."
          >
            <Trash2 className="size-4" /> Delete
          </ConfirmButton>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Developer mode: the production or preview variable set as an editable
 * .env document. Saving replaces that set (missing keys are removed).
 */
function EnvDeveloperEditor({
  title,
  serviceId,
  isPreview,
  canWrite,
  onSaved,
  actions,
}: {
  title: string;
  serviceId: string;
  isPreview: boolean;
  canWrite: boolean;
  onSaved: () => void;
  actions?: ReactNode;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const { data: revealed } = useQuery({
    queryKey: ['env-revealed', serviceId],
    queryFn: () => listEnv(serviceId, true),
    enabled: canWrite,
  });

  // Derive the initial document from the revealed vars; `raw` only holds
  // user edits, avoiding a setState-in-effect.
  const doc =
    raw ??
    (revealed
      ? revealed
          .filter((v) => v.isPreview === isPreview)
          .map((v) => `${v.key}=${v.value}`)
          .join('\n')
      : null);

  const saveMut = useMutation({
    mutationFn: () => bulkSaveEnv(serviceId, doc ?? '', isPreview),
    onSuccess: (res) => {
      setRaw(null);
      onSaved();
      toast.success(`Saved ${res.saved} variable${res.saved === 1 ? '' : 's'}${res.deleted ? `, removed ${res.deleted}` : ''}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <Panel
      title={title}
      actions={actions}
      contentClassName="space-y-2 p-4"
      footer={
        <Button
          size="sm"
          onClick={() => saveMut.mutate()}
          disabled={!canWrite || doc === null || saveMut.isPending}
        >
          Save all
        </Button>
      }
    >
      <p className="text-muted-foreground text-[11.5px]">
        Edit {isPreview ? 'preview' : 'production'} variables as one .env document (KEY=value per line, #
        comments ignored). Saving replaces this set — variables removed here are deleted.
      </p>
      <Textarea
        className="max-h-[60vh] min-h-72 overflow-y-auto font-mono text-[12px] break-all [field-sizing:fixed]"
        value={doc ?? ''}
        placeholder={doc === null ? 'loading variables…' : 'KEY=value'}
        disabled={!canWrite || doc === null}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
      />
    </Panel>
  );
}
