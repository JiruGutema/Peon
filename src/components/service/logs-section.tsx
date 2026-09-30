'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getServiceLogs } from '@/services/api/service';
import { Panel } from '@/components/app/page';

export function LogsSection({ serviceId }: { serviceId: string }) {
  const [tail, setTail] = useState(200);
  const [follow, setFollow] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ['service-logs', serviceId, tail],
    queryFn: () => getServiceLogs(serviceId, tail),
    refetchInterval: follow ? 5000 : false,
  });

  useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ block: 'end' });
  }, [data, follow]);

  const downloadLogs = async () => {
    setDownloading(true);
    try {
      const full = await getServiceLogs(serviceId, 0);
      const blob = new Blob([full.lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${full.container || serviceId}-logs.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to download logs');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-44">
            <SearchableSelect
              value={String(tail)}
              onValueChange={(v) => setTail(Number(v))}
              placeholder="Select log lines"
              size="sm"
              options={[100, 200, 500, 1000, 2000].map((n) => ({
                value: String(n),
                label: `last ${n} lines`,
              }))}
            />
          </div>
          <label className="text-muted-foreground flex items-center gap-2 text-[12px]">
            <Switch checked={follow} onCheckedChange={setFollow} /> auto-refresh
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadLogs} disabled={downloading}>
            <Download className="size-3.5" /> Download full logs
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RotateCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <Panel
        title={data ? `container: ${data.container}` : 'logs'}
        contentClassName="bg-[#0a0f0c] flex min-h-0 flex-1 flex-col"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <pre className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-neutral-200">
            {error
              ? `Failed to fetch logs: ${error instanceof Error ? error.message : 'unknown error'}`
              : data?.lines.length
                ? data.lines.join('\n')
                : isFetching
                  ? 'Loading logs…'
                  : 'No log output. Is the container running?'}
          </pre>
          <div ref={endRef} />
        </div>
      </Panel>
    </div>
  );
}
