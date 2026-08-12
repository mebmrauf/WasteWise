"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/Button";


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
          <div className="flex items-center gap-4 text-body-sm text-neutral-500">
            <span>Logged in as <span className="font-medium text-neutral-900">{user.email ?? user.phone}</span></span>
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