"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api/axios";
import { setStoredAuth } from "@/lib/auth";
import { loginSchema, type LoginSchema } from "@/lib/validation/auth";
import type { AuthResponse } from "@/types";

export function LoginForm({
  registrationSuccess = false,
  redirectTo = "/dashboard",
}: {
  registrationSuccess?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginSchema) => {
    setFormError(null);

    try {
      const response = await api.post<AuthResponse>("/api/auth/login", values);
      setStoredAuth(response.data);
      router.push(redirectTo);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "response" in error) {
        setFormError("Invalid credentials. Please check your email and password.");
        return;
      }

      setFormError("We couldn't reach the sign-in service. Please try again when the API is available.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-none bg-white/90">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft">
            <LogIn className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-3xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage your SofiaCart storefront.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {registrationSuccess ? (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Merchant registration submitted successfully. Sign in to continue.
            </div>
          ) : null}
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="merchant@example.com" hasError={!!errors.email} {...register("email")} />
              {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" hasError={!!errors.password} {...register("password")} />
              {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password.message}</p> : null}
            </div>
            {formError ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div> : null}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New merchant?{" "}
            <Link href="/register/merchant" className="font-semibold text-brand-700 hover:text-brand-800">
              Start registration
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
