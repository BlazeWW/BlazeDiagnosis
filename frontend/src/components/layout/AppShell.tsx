import React from 'react';

interface AppShellProps {
  title?: string;
  paragraph?: string;
  children: React.ReactNode;
}

export function AppShell({ title, paragraph, children }: AppShellProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>{title}</h1>
        <p style={{ color: '#555' }}>{paragraph}</p>
      </header>
      <section>{children}</section>
    </div>
  );
}
