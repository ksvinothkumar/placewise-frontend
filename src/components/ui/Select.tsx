import { forwardRef, type SelectHTMLAttributes } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', ...rest }, ref) => (
  <select ref={ref} className={('select ' + className).trim()} {...rest} />
));
Select.displayName = 'Select';
