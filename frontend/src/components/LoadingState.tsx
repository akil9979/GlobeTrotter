export const LoadingState = ({ label = "Loading…" }: { label?: string }) => (
  <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">{label}</div>
);
