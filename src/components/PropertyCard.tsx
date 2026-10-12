import { Link } from "react-router-dom";
import { BadgeCheck, BedDouble, Bath, MapPin } from "lucide-react";
import { naira, totalOf } from "@/lib/auth";
import { Status } from "./AppShell";

export default function PropertyCard({ p, to, showStatus }: { p: any; to?: string; showStatus?: boolean }) {
  const body = (
    <div className="group overflow-hidden rounded-3xl border bg-card transition hover:shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[4/3] bg-muted">
        {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />}
        <span className="chip absolute left-3 top-3 bg-card"><BadgeCheck className="h-3 w-3 text-success" />{showStatus ? "" : "Verified"}{showStatus && <Status s={p.status} />}</span>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.property_type}</p>
        <h3 className="mt-1 line-clamp-1 text-lg font-bold">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{[p.area, p.city].filter(Boolean).join(", ")}</p>
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{p.bedrooms}</span><span className="flex items-center gap-1"><Bath className="h-4 w-4" />{p.bathrooms}</span></div>
        <div className="mt-4 flex items-end justify-between border-t pt-4">
          <div><p className="text-xs text-muted-foreground">Rent / year</p><p className="font-display text-xl font-bold">{naira(p.rent)}</p></div>
          <div className="text-right"><p className="text-xs text-muted-foreground">All-in</p><p className="text-sm font-semibold">{naira(totalOf(p))}</p></div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
