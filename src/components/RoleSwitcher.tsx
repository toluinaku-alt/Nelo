"use client";

import { useState, useTransition } from "react";
import { switchUserAction } from "@/lib/actions";
import { DEMO_USERS, STAFF_ROLES } from "@/lib/types";
import { ShieldCheck, UserCheck, RefreshCw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface RoleSwitcherProps {
  currentEmail: string;
}

export function RoleSwitcher({ currentEmail }: RoleSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const currentUser = DEMO_USERS.find((u) => u.email === currentEmail) || DEMO_USERS[0];
  const isCustomer = currentUser.role === "CUSTOMER";

  // Hide demo controls from customers by default, but allow manual expand for testing/evaluation
  const [isOpen, setIsOpen] = useState(!isCustomer);

  const handleSelect = (email: string) => {
    startTransition(async () => {
      await switchUserAction(email);
    });
  };

  // For customer: minimal unobtrusive floating pill in the bottom right corner
  if (isCustomer && !isOpen) {
    return (
      <aside aria-label="Demo role selector" className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-slate-300 hover:text-white text-[11px] font-medium shadow-lg backdrop-blur-md border border-slate-700/60 transition active:scale-95"
          title="Open Pilot Persona Switcher"
        >
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Demo Role ({currentUser.name})</span>
          <ChevronUp className="h-3 w-3" />
        </button>
      </aside>
    );
  }

  return (
    <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide uppercase text-slate-300 text-[11px]">
            {isCustomer ? "Demo Simulation Mode:" : "Staff Console:"}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-800 text-emerald-300 font-medium px-2.5 py-1 rounded-md border border-slate-700">
            <UserCheck className="h-3.5 w-3.5" />
            {currentUser.name} ({currentUser.title})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="role-select" className="text-slate-400 text-[11px] hidden sm:inline">
            Switch View:
          </label>
          <select
            id="role-select"
            value={currentEmail}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={isPending}
            className="bg-slate-800 text-white border border-slate-700 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            {DEMO_USERS.map((user) => (
              <option key={user.email} value={user.email}>
                {user.role}: {user.name}
              </option>
            ))}
          </select>
          {isPending && <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />}

          {isCustomer && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ml-2 text-slate-400 hover:text-white text-[11px] px-2 py-0.5 rounded border border-slate-700"
              title="Hide switcher for clean customer view"
            >
              Hide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
