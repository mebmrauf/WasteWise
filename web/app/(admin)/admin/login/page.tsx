"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (user && user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ identifier: email, password });
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-h2 mb-2 text-neutral-900">Admin Login</h1>
        <p className="text-body text-neutral-500 mb-6">Enter your credentials to access the admin portal.</p>
        
        {error && <ErrorBanner title="Login failed" className="mb-6">{error}</ErrorBanner>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth disabled={isLoading} className="mt-4">
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}