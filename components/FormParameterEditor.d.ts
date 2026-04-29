import type { JSX } from 'react';

interface FormParameterEditorItem {
  parameter_name: string;
  display_suffix?: string | null;
  unit_options?: string[] | null;
  [key: string]: unknown;
}

export interface FormParameterEditorProps {
  items?: FormParameterEditorItem[];
  onAdd: (...args: unknown[]) => Promise<unknown>;
  onUpdate: (...args: unknown[]) => Promise<unknown>;
  onDelete: (...args: unknown[]) => Promise<unknown>;
  saving?: boolean;
}

export default function FormParameterEditor(props: FormParameterEditorProps): JSX.Element | null;
