// components/ui/ErrorBanner.tsx — aviso de error con acción opcional (reintentar / cerrar).

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorBanner({ message, onRetry, onClose }: ErrorBannerProps) {
  return (
    <div role="alert" className="mb-4 bg-paper border border-rust/40 rounded-card px-3 py-2.5 flex items-start gap-3">
      <p className="bb-body text-sm text-rust flex-1 break-words">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="bb-touch px-3 border border-line rounded-card bb-body text-sm hover:bg-canvas">
          Reintentar
        </button>
      )}
      {onClose && (
        <button type="button" onClick={onClose} className="bb-touch w-8 text-ink-soft" aria-label="Cerrar aviso">✕</button>
      )}
    </div>
  );
}
