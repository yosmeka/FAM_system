"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import "./login.css";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials");
        return;
      }

      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-page-bg">
      {/* No background pattern - removed */}

      {/* Login form */}
      <div className="login-container w-full max-w-sm bg-white p-6 rounded-xl login-card-shadow border border-gray-200 mx-4 md:mx-0 md:mr-8 lg:mr-16 md:self-center md:flex-none">
        {/* Logo and Header */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="relative w-36 h-12 mb-2">
            <Image
              src="/auth/login/zemen.png"
              alt="Zemen Bank Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <p className="text-center text-sm font-medium text-gray-700 mt-1">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <input
                {...register("email")}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@zemenbank.com"
                className="w-full px-3 py-2 text-sm border dark:text-gray-800 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 zemen-ring-red zemen-border-red zemen-focus-red"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                {...register("password")}
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border dark:text-gray-800 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 zemen-ring-red zemen-border-red zemen-focus-red"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white zemen-bg-red hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 zemen-ring-red transition-colors duration-200 shadow-md"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Zemen Bank S.C.
          </p>
        </div>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer position="top-right" autoClose={1000} />
    </div>
  );
}
