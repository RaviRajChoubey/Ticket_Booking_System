"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const venueSchema = z.object({
  name: z.string().min(2, "Venue name required"),
  address: z.string().min(5, "Address required"),
  totalRows: z.number().min(1).max(26),
  totalCols: z.number().min(1).max(30),
});

type VenueForm = z.infer<typeof venueSchema>;

type Category = { name: string; rows: number[]; price: number };

export default function CreateVenuePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([
    { name: "Premium", rows: [1, 2, 3], price: 500 },
    { name: "Standard", rows: [4, 5, 6, 7, 8], price: 200 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<VenueForm>({
    resolver: zodResolver(venueSchema),
    defaultValues: { totalRows: 10, totalCols: 15 },
  });

  const addCategory = () => {
    setCategories([...categories, { name: "", rows: [], price: 0 }]);
  };

  const removeCategory = (i: number) => {
    setCategories(categories.filter((_, idx) => idx !== i));
  };

  const updateCategory = (i: number, field: keyof Category, value: any) => {
    const updated = [...categories];
    (updated[i] as any)[field] = value;
    setCategories(updated);
  };

  const onSubmit = async (data: VenueForm) => {
    setIsSubmitting(true);
    setError(null);

    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, categories }),
    });
    const json = await res.json();
    setIsSubmitting(false);

    if (!res.ok) { setError(json.message || "Failed to create venue"); return; }
    router.push("/admin");
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-10">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Admin
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Create New Venue</h1>

      <div className="glass rounded-2xl p-8 border border-white/10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}

          {[
            { name: "name", label: "Venue Name", placeholder: "e.g. IMAX Mumbai" },
            { name: "address", label: "Address", placeholder: "Full address" },
          ].map(({ name, label, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">{label}</label>
              <input {...register(name as any)} id={name} type="text" placeholder={placeholder}
                className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
              {errors[name as keyof VenueForm] && <p className="text-red-400 text-xs">{errors[name as keyof VenueForm]?.message}</p>}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "totalRows", label: "Total Rows", min: 1, max: 26 },
              { name: "totalCols", label: "Seats per Row", min: 1, max: 30 },
            ].map(({ name, label, min, max }) => (
              <div key={name} className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <input {...register(name as any, { valueAsNumber: true })} id={name} type="number" min={min} max={max}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all" />
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Seat Categories</label>
              <button type="button" onClick={addCategory} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>
            {categories.map((cat, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                <input value={cat.name} onChange={(e) => updateCategory(i, "name", e.target.value)}
                  placeholder="Name (e.g. Premium)"
                  className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
                <input value={cat.rows.join(",")} onChange={(e) => updateCategory(i, "rows", e.target.value.split(",").map(Number).filter(Boolean))}
                  placeholder="Rows (e.g. 1,2,3)"
                  className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
                <div className="flex gap-2">
                  <input value={cat.price} onChange={(e) => updateCategory(i, "price", Number(e.target.value))}
                    type="number" placeholder="Price ₹"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
                  <button type="button" onClick={() => removeCategory(i)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button id="create-venue-submit" type="submit" disabled={isSubmitting}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Venue"}
          </button>
        </form>
      </div>
    </div>
  );
}
