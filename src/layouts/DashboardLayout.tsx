/**
 * DashboardLayout
 *
 * Thin wrapper around AppLayout. Exists so that future react-router-dom
 * adoption can use this as a route-level layout component.
 * All authenticated pages render inside this layout.
 */
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import type { NavigationTab } from "@/routes";

interface DashboardLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  currentTab,
  onSelectTab,
  children,
}: DashboardLayoutProps) {
  return (
    <AppLayout currentTab={currentTab} onSelectTab={onSelectTab}>
      {children}
    </AppLayout>
  );
}
