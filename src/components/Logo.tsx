import { Link } from "react-router-dom";
import { House } from "lucide-react";
export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display text-xl font-extrabold ${light ? "text-primary-foreground" : "text-primary"}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><House size={21} strokeWidth={2.5} /></span> betterhouse
    </Link>
  );
}
