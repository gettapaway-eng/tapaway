'use client';

import { createContext, useContext } from 'react';

// Navigation + selection shared across the admin, so the ⌘K palette (or any
// page) can say "show me this tag" and the right section opens with the
// right inspector.

export type Section = 'overview' | 'tags' | 'users' | 'waitlist' | 'orders' | 'activity';
export const SECTIONS: Section[] = ['overview', 'tags', 'users', 'waitlist', 'orders', 'activity'];

export type Selection = { kind: 'tag' | 'user' | 'order'; id: string } | null;

/** Sections each role can open. Provisioners get the tag inventory, read-only. */
export const ROLE_SECTIONS: Record<'admin' | 'provisioner', Section[]> = {
  admin: SECTIONS,
  provisioner: ['tags'],
};

export interface AdminNav {
  role: 'admin' | 'provisioner';
  email: string;
  section: Section;
  go: (section: Section) => void;
  selection: Selection;
  select: (selection: Selection) => void;
}

export const AdminNavContext = createContext<AdminNav | null>(null);

export function useAdminNav(): AdminNav {
  const value = useContext(AdminNavContext);
  if (!value) throw new Error('useAdminNav must be used inside the admin shell');
  return value;
}
