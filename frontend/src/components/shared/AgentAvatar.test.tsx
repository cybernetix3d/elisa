import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentAvatar from './AgentAvatar';

describe('AgentAvatar', () => {
  it('renders initial letter', () => {
    render(<AgentAvatar name="Sparky" role="builder" status="idle" />);
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('uses sky for builder role', () => {
    const { container } = render(<AgentAvatar name="Sparky" role="builder" status="idle" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('bg-accent-sky');
  });

  it('uses mint for tester role', () => {
    const { container } = render(<AgentAvatar name="Testy" role="tester" status="idle" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('bg-accent-mint');
  });

  it('uses lavender for reviewer role', () => {
    const { container } = render(<AgentAvatar name="Review" role="reviewer" status="idle" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('bg-accent-lavender');
  });

  it('uses coral for custom role', () => {
    const { container } = render(<AgentAvatar name="Custom" role="custom" status="idle" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('bg-accent-coral');
  });

  it('applies opacity for idle status', () => {
    const { container } = render(<AgentAvatar name="S" role="builder" status="idle" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('opacity-50');
  });

  it('applies bounce animation for working status', () => {
    const { container } = render(<AgentAvatar name="S" role="builder" status="working" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('animate-bounce');
  });

  it('shows checkmark for done status', () => {
    const { container } = render(<AgentAvatar name="S" role="builder" status="done" />);
    const checkmark = container.querySelector('.bg-accent-mint');
    expect(checkmark).toBeTruthy();
  });

  it('applies coral bg for error status', () => {
    const { container } = render(<AgentAvatar name="S" role="builder" status="error" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('bg-accent-coral');
  });

  it('supports small size', () => {
    const { container } = render(<AgentAvatar name="S" role="builder" status="idle" size="sm" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('w-6');
  });
});
