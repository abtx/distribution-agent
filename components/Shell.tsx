"use client";
import Link from "@/lib/navigation";
import {
  Bot,
  Clapperboard,
  LayoutDashboard,
  Lightbulb,
  Package,
  Plug,
  Send,
  ShieldCheck,
} from "lucide-react";
import { usePathname } from "@/lib/navigation";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app">
      <aside>
        <Link className="brand" href="/">
          <span className="brandmark">
            <Bot size={20} />
          </span>
          <span>
            Distribution
            <br />
            <b>Agent</b>
          </span>
        </Link>
        <nav>
          <Link className={path === "/" ? "active" : ""} href="/">
            <LayoutDashboard size={17} /> Opportunities
          </Link>
          <Link
            className={path.startsWith("/content") ? "active" : ""}
            href="/content"
          >
            <Send size={17} /> Content
          </Link>
          <Link
            className={path.startsWith("/videos") ? "active" : ""}
            href="/videos"
          >
            <Clapperboard size={17} /> Videos
          </Link>
          <Link
            className={path.startsWith("/strategy") ? "active" : ""}
            href="/strategy"
          >
            <Lightbulb size={17} /> Strategy
          </Link>
          <Link
            className={path.startsWith("/products") ? "active" : ""}
            href="/products"
          >
            <Package size={17} /> Products
          </Link>
          <Link
            className={path.startsWith("/connections") ? "active" : ""}
            href="/connections"
          >
            <Plug size={17} /> Connections
          </Link>
        </nav>
        <div className="secure">
          <ShieldCheck size={16} />
          <div>
            <b>Local command centre</b>
            <span>Publishing stays in your control</span>
          </div>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
