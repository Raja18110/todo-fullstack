"use client";

import React, { useState } from "react";
import { apiFetch } from "../utils/client";
import { Mail, Lock, User as UserIcon, Loader, CheckCircle, AlertCircle } from "./Icons";

interface AuthProps {
  onSuccess: (token: string) => void;
}

export default function AuthComponent({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        // Login
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: { email, password },
        });
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          onSuccess(data.access_token);
        }, 800);
      } else {
        // Register
        await apiFetch("/auth/register", {
          method: "POST",
          body: {
            email,
            password,
            full_name: fullName || null,
          },
        });
        setSuccess("Registration successful! You can now log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {isLogin
            ? "Sign in to manage your tasks efficiently"
            : "Unlock premium task management capabilities"}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-lg bg-zinc-950 p-1">
        <button
          onClick={() => {
            setIsLogin(true);
            setError(null);
            setSuccess(null);
          }}
          className={`w-1/2 rounded-md py-2 text-sm font-semibold transition-all duration-200 ${
            isLogin
              ? "bg-zinc-800 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Login
        </button>
        <button
          onClick={() => {
            setIsLogin(false);
            setError(null);
            setSuccess(null);
          }}
          className={`w-1/2 rounded-md py-2 text-sm font-semibold transition-all duration-200 ${
            !isLogin
              ? "bg-zinc-800 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Register
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <UserIcon size={18} />
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <Mail size={18} />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <Lock size={18} />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? (
            <Loader size={18} className="text-black" />
          ) : isLogin ? (
            "Sign In"
          ) : (
            "Register"
          )}
        </button>
      </form>
    </div>
  );
}
