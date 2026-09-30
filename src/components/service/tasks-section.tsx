'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  runTask,
  listTaskExecutions,
  type ScheduledTaskItem,
} from '@/services/api/service';
import { Panel } from '@/components/app/page';
import { ConfirmButton } from '@/components/app/confirm';
import { StatusBadge } from '@/components/app/status-badge';
import { RunOutput } from '@/components/app/run-output';
import { LocalDateTime } from '@/components/app/local-datetime';
import { formatLocalDateTime } from '@/lib/datetime';

export function TasksSection({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const { data: tasks } = useQuery({
    queryKey: ['tasks', serviceId],
    queryFn: () => listTasks(serviceId),
    refetchInterval: 10_000,
  });
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [frequency, setFrequency] = useState('0 0 * * *');
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', serviceId] });

  const addMut = useMutation({
    mutationFn: () => createTask(serviceId, { name, command, frequency }),
    onSuccess: async () => {
      await invalidate();
      setName('');
      setCommand('');
      toast.success('Task created');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  return (
    <div className="space-y-4">
      <Panel
        title="new scheduled task"
        contentClassName="space-y-3 p-4"
        footer={
          <Button size="sm" onClick={() => addMut.mutate()} disabled={!name || !command || !frequency || addMut.isPending}>
            Add task
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-name">Name</Label>
            <Input id="task-name" placeholder="cleanup-cache" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-freq">Frequency (cron)</Label>
            <Input
              id="task-freq"
              className="font-mono"
              placeholder="0 0 * * *"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-cmd">Command (runs inside the container)</Label>
          <Input
            id="task-cmd"
            className="font-mono"
            placeholder="pnpm run scheduler:clean"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />
        </div>
      </Panel>

      {tasks?.length ? (
        tasks.map((t) => <TaskEditor key={t.id} serviceId={serviceId} task={t} />)
      ) : (
        <Panel contentClassName="p-6">
          <div className="text-muted-foreground text-center text-[12.5px]">
            no scheduled tasks. add one above - it runs inside the service container on a cron schedule.
          </div>
        </Panel>
      )}
    </div>
  );
}

function TaskEditor({ serviceId, task }: { serviceId: string; task: ScheduledTaskItem }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const val = <T,>(k: keyof ScheduledTaskItem, fallback: T): T =>
    (form[k as string] as T) ?? ((task[k] as T) ?? fallback);
  const dirty = Object.keys(form).length > 0;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks', serviceId] });

  const saveMut = useMutation({
    mutationFn: () => updateTask(serviceId, task.id, form),
    onSuccess: async () => {
      await invalidate();
      setForm({});
      toast.success('Task saved');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const toggleMut = useMutation({
    mutationFn: () => updateTask(serviceId, task.id, { enabled: !task.enabled }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const runMut = useMutation({
    mutationFn: () => runTask(serviceId, task.id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Task queued - check executions shortly');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const delMut = useMutation({
    mutationFn: () => deleteTask(serviceId, task.id),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          {task.name}
          {!task.enabled && <Badge variant="outline" className="text-[10px]">disabled</Badge>}
        </span>
      }
      contentClassName="space-y-4 p-4"
      footer={
        <>
          <ConfirmButton
            onConfirm={() => delMut.mutate()}
            title={`Delete task "${task.name}"?`}
            description="The schedule and its execution history will be permanently removed."
            disabled={delMut.isPending}
            className="mr-auto"
          >
            <Trash2 className="size-3.5" /> Delete
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}>
            {task.enabled ? 'Disable task' : 'Enable task'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            <Play className="size-3.5" /> Execute now
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={val('name', '')} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Frequency (cron)</Label>
          <Input
            className="font-mono"
            value={val('frequency', '')}
            onChange={(e) => set('frequency', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Timeout (seconds)</Label>
          <Input
            type="number"
            value={String(val('timeout', 300))}
            onChange={(e) => set('timeout', Number(e.target.value) || 300)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Container name</Label>
          <Input
            placeholder="defaults to the service container"
            value={val('container', '') ?? ''}
            onChange={(e) => set('container', e.target.value || null)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Command</Label>
        <Input
          className="font-mono"
          value={val('command', '')}
          onChange={(e) => set('command', e.target.value)}
        />
      </div>

      <TaskExecutions serviceId={serviceId} task={task} />
    </Panel>
  );
}

function TaskExecutions({ serviceId, task }: { serviceId: string; task: ScheduledTaskItem }) {
  const [open, setOpen] = useState(false);
  const { data: executions } = useQuery({
    queryKey: ['task-executions', task.id],
    queryFn: () => listTaskExecutions(serviceId, task.id),
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });
  const last = task.executions[0];

  return (
    <div className="text-[11px]">
      <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground transition-colors">
        {task._count.executions} execution{task._count.executions === 1 ? '' : 's'}
        {last ? ` · last: ${last.status.toLowerCase()} ${formatLocalDateTime(last.startedAt)}` : ''}
        {open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {executions?.length ? (
            executions.map((e) => (
              <div
                key={e.id}
                className="border-border/60 bg-secondary/30 space-y-2 rounded-lg border px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={e.status} />
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    <LocalDateTime value={e.startedAt} />
                    {e.duration != null ? ` · ${(e.duration / 1000).toFixed(1)}s` : ''}
                  </span>
                </div>
                <RunOutput message={e.message} />
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">no executions yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
