"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/Button";
import Link from "next/link";
import { cn } from "@/lib/utils";


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && pathname !== "/admin/login") {
      if (!user || user.role !== "ADMIN") {
        router.replace("/admin/login");
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-primary-600">WasteWise</span>
          <span className="text-body font-medium text-neutral-500">Admin Portal</span>
        </div>
        {user && user.role === "ADMIN" && (
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/admin"
              className={cn(
                "text-body-sm font-medium transition-colors",
                pathname === "/admin" ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Verifications
            </Link>
            <Link
              href="/admin/complaints"
              className={cn(
                "text-body-sm font-medium transition-colors",
                pathname.startsWith("/admin/complaints") ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Complaints
            </Link>
            <Link
              href="/admin/payments"
              className={cn(
                "text-body-sm font-medium transition-colors",
                pathname.startsWith("/admin/payments") ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Payments
            </Link>
            <Link
              href="/admin/waste-analysis"
              className={cn(
                "text-body-sm font-medium transition-colors",
                pathname.startsWith("/admin/waste-analysis") ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Waste Analysis
            </Link>
                        <Link
              href="/admin/campaigns"
              className={cn(
                "text-body-sm font-medium transition-colors",
                pathname.startsWith("/admin/campaigns") ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              Campaigns
            </Link>
          </nav>
        )}
        {user && user.role === "ADMIN" && (
          <div className="flex items-center gap-4 text-body-sm text-neutral-500">
            <span>Logged in as <span className="font-medium text-neutral-900">{user.email}</span></span>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await logout();
                router.push("/admin/login");
              }}
            >
              Log out
            </Button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-5xl p-6 md:p-10">{children}</main>
    </div>
  );
}