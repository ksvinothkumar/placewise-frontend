import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Paginated } from './Paginated';

const items = Array.from({ length: 23 }, (_, i) => `row ${i + 1}`);
const table = (rows: string[]) => (
  <ul>
    {rows.map((r) => (
      <li key={r}>{r}</li>
    ))}
  </ul>
);

describe('Paginated', () => {
  it('shows 10 rows at a time and pages forward and back', () => {
    render(<Paginated items={items} render={table} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('1–10 of 23')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('21–23 of 23')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('11–20 of 23')).toBeInTheDocument();
  });

  it('changes the page size and returns to page 1', () => {
    render(<Paginated items={items} render={table} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '25' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(23);
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('has no pager when the list fits one small page, and steps back when the list shrinks', () => {
    const { rerender } = render(<Paginated items={items.slice(0, 5)} render={table} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    rerender(<Paginated items={items} render={table} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    rerender(<Paginated items={items.slice(0, 12)} render={table} />);
    expect(screen.getByText('11–12 of 12')).toBeInTheDocument();
  });
});
