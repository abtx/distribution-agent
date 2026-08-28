import { useEffect, useState } from "react";
import { CheckCircle, ExternalLink, X } from "lucide-react";
import { toastEvent, type AppToast } from "@/lib/toast";

export function GlobalToast() {
  const [toast, setToast] = useState<AppToast | null>(null);

  useEffect(() => {
    const receive = (event: Event) => {
      setToast((event as CustomEvent<AppToast>).detail);
    };
    window.addEventListener(toastEvent, receive);
    return () => window.removeEventListener(toastEvent, receive);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) return null;
  return (
    <aside className="global-toast" role="status" aria-live="polite">
      <CheckCircle size={19} />
      <div>
        <b>{toast.title}</b>
        <span>{toast.message}</span>
        {toast.url && (
          <a href={toast.url} target="_blank" rel="noreferrer">
            View reply <ExternalLink size={12} />
          </a>
        )}
      </div>
      <button type="button" aria-label="Dismiss confirmation" onClick={() => setToast(null)}>
        <X size={15} />
      </button>
    </aside>
  );
}
