"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Film, Music, Search, X } from "lucide-react";
import { useState, useTransition } from "react";

export function EventFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const currentType = searchParams.get("type") || "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => router.push(`/?${params.toString()}`));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", search);
  };

  const clearAll = () => {
    setSearch("");
    startTransition(() => router.push("/"));
  };

  const hasFilters = currentType || search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id="event-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="pl-9 pr-4 py-2 text-sm bg-slate-800/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 w-52"
        />
      </form>

      {/* Type filters */}
      {[
        { value: "", label: "All", icon: null },
        { value: "MOVIE", label: "Movies", icon: Film },
        { value: "CONCERT", label: "Concerts", icon: Music },
      ].map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          id={`filter-${value || "all"}`}
          onClick={() => updateFilter("type", value)}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border transition-all
            ${currentType === value
              ? "bg-violet-600 border-violet-500 text-white"
              : "glass border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </button>
      ))}

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}

      {isPending && (
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
