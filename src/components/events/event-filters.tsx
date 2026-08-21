"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Film, Music, Search, X, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

export function EventFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const currentType = searchParams.get("type") || "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
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

  const hasFilters = Boolean(currentType || search);

  const filters = [
    { value: "", label: "All Events", icon: Sparkles },
    { value: "MOVIE", label: "Movies", icon: Film },
    { value: "CONCERT", label: "Concerts", icon: Music },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative w-full sm:w-64">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id="event-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies or concerts..."
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
        />
      </form>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        {filters.map(({ value, label, icon: Icon }) => {
          const isActive = currentType === value;
          return (
            <button
              key={value}
              id={`filter-${value || "all"}`}
              onClick={() => updateFilter("type", value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/40"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{label}</span>
            </button>
          );
        })}

        {/* Clear Filters Button */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {isPending && (
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin ml-2" />
      )}
    </div>
  );
}
