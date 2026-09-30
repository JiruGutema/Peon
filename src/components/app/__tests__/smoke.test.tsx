// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('dom test infra', () => {
  it('renders into jsdom', () => {
    render(<span>hello</span>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
