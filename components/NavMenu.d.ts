import type { JSX, ReactNode } from 'react';

export interface NavMenuAction {
  key: string;
  label: string;
  icon?: ReactNode;
  adminOnly?: boolean;
  [key: string]: unknown;
}

export interface NavMenuProps {
  user?: {
    id?: string | null;
    [key: string]: unknown;
  } | null;
  isAdmin: boolean;
  onSignOut?: () => Promise<unknown> | unknown;
  currentPage: string;
  actions?: NavMenuAction[];
  onAction?: (action: NavMenuAction) => void;
}

export default function NavMenu(props: NavMenuProps): JSX.Element | null;
