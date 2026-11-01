import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/recruitment-utils';
import { useUiStore } from '@/stores/ui.store';
import { Sidebar } from './Sidebar';

describe('Sidebar tooltips', () => {
  beforeEach(() => useUiStore.setState({ navCollapsed: false }));

  it('names an icon on hover and focus when the menu is collapsed, and hides it again', () => {
    useUiStore.setState({ navCollapsed: true });
    renderWithProviders(<Sidebar counts={{}} />);
    const link = screen.getByRole('link', { name: 'Jobs' });
    fireEvent.mouseEnter(link);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Jobs');
    fireEvent.mouseLeave(link);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(screen.getByRole('link', { name: 'Clients' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Clients');
  });

  it('shows no tooltip when the menu is open, since the labels are visible', () => {
    renderWithProviders(<Sidebar counts={{}} />);
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Jobs' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
