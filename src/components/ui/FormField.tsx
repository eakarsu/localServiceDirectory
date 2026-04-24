'use client';

import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormFieldProps {
  label?: string;
  error?: FieldError;
  children: React.ReactNode;
  helperText?: string;
}

export default function FormField({ label, error, children, helperText }: FormFieldProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
