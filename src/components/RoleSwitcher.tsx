"use client";

import { useTransition } from "react";
import { switchUserAction } from "@/lib/actions";
import { DEMO_USERS } from "@/lib/types";
import { ShieldAlert, UserCheck, RefreshCw } from "lucide-react";

interface RoleSwitcherProps {
  currentEmail: string;
}

export function RoleSwitcher({ currentEmail }: RoleSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  const currentUser = DEMO_USERS.find((u) => u.email === currentEmail) || DEMO_USERS[0];

  const handleSelect = (email: string) => {
    startTransition(async () => {
      await switchUserAction(email);
    });
  };

  return (
    <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide uppercase text-slate-300">
            Persona Switcher:
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-800 text-emerald-300 font-medium px-2.5 py-1 rounded-md border border-slate-700">
            <UserCheck className="h-3.5 w-3.5" />
            {currentUser.name} ({currentUser.title})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="role-select" className="text-slate-400 hidden sm:inline">
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
        </div>
      </div>
    </div>
  );
}
