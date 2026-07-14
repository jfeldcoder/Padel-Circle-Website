import { useEffect, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet with a scrim; slides up over the page content. */
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-bg rounded-t-3xl border-t border-line max-h-[88dvh] flex flex-col transition-transform duration-150 ease-out"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <h2 className="font-display text-xl font-medium">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted p-1 -mr-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}
