import { EmptyState } from "./EmptyState";

export const PagePlaceholder = ({ title }: { title: string }) => (
  <section>
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    <div className="mt-6"><EmptyState title={`${title} is ready for UI work`} description="This route and its application foundation are in place." /></div>
  </section>
);
