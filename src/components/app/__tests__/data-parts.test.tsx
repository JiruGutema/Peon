// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge, statusTone } from '../status-badge';
import { StatCard } from '../stat-card';
import { DataTable } from '../data-table';
import { ListRow } from '../list-row';
import { KindChip, RolePill } from '../kind-chip';

describe('StatusBadge', () => {
  it('maps known statuses to tones', () => {
    expect(statusTone('RUNNING')).toBe('success');
    expect(statusTone('BUILDING')).toBe('warning');
    expect(statusTone('FAILED')).toBe('destructive');
    expect(statusTone('STOPPED')).toBe('muted');
    expect(statusTone('DISCONNECTED')).toBe('destructive');
    expect(statusTone('UNREACHABLE')).toBe('destructive');
  });
  it('renders unknown statuses as a muted sentence-case label instead of crashing', () => {
    render(<StatusBadge status="PROVISIONING_DISK" />);
    const el = screen.getByText('Provisioning disk');
    expect(el.closest('[data-tone]')?.getAttribute('data-tone')).toBe('muted');
  });
  it('does not force lowercase', () => {
    render(<StatusBadge status="Needs setup" tone="warning" />);
    expect(screen.getByText('Needs setup')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders value in mono display size', () => {
    render(<StatCard label="Servers" value={3} />);
    const v = screen.getByText('3');
    expect(v.className).toContain('font-mono');
    expect(v.className).toContain('text-display');
  });
});

describe('DataTable', () => {
  const columns = [{ key: 'name', header: 'Name', cell: (r: { id: string; name: string }) => r.name }];
  it('renders rows and header', () => {
    render(<DataTable columns={columns} rows={[{ id: '1', name: 'web' }]} rowKey={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });
  it('renders the empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} emptyState={<p>Nothing here</p>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
  it('renders skeleton rows while loading', () => {
    const { container } = render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} isLoading />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
  it('links rows when rowHref is given', () => {
    render(<DataTable columns={columns} rows={[{ id: '1', name: 'web' }]} rowKey={(r) => r.id} rowHref={(r) => `/s/${r.id}`} />);
    expect(screen.getByRole('link', { name: 'web' })).toHaveAttribute('href', '/s/1');
  });
});

describe('ListRow', () => {
  it('renders as a link when href given', () => {
    render(<ListRow href="/x" title="Server one" subtitle="10.0.0.1" />);
    expect(screen.getByRole('link', { name: /Server one/ })).toHaveAttribute('href', '/x');
  });
});

describe('chips', () => {
  it('render sentence-case labels', () => {
    render(<><KindChip kind="GIT_APP" /><RolePill role="BILLING_ADMIN" /></>);
    expect(screen.getByText('Git app')).toBeInTheDocument();
    expect(screen.getByText('Billing admin')).toBeInTheDocument();
  });
});
