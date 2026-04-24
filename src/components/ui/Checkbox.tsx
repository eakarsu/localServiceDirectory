'use client';

import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  label?: string;
  disabled?: boolean;
}

export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
}: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}
