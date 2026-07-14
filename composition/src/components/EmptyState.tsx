interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="text-muted text-sm">{message}</p>
      {actionLabel && onAction && (
        <button className="mt-4 text-accent font-medium text-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
