import { Menu } from '~/components/sidebar/Menu.client';
import { Header } from '~/components/header/Header';
import { ClientOnly } from 'remix-utils/client-only';
import BackgroundRays from '~/components/ui/BackgroundRays';
import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header className="shrink-0" />
      <div className="flex flex-1 overflow-visible">
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div className="flex-1 overflow-visible">{children}</div>
      </div>
    </div>
  );
}
