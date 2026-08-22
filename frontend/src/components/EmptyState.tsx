export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <h2 className="font-semibold text-slate-800">{title}</h2>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </div>
);
