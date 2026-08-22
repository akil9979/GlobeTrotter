import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { Button } from "../components/Button";

export const NotFoundPage = () => {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-50 text-sky-600 shadow-subtle mb-6 border border-sky-100">
        <Compass className="h-10 w-10 animate-spin-slow" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-sky-700">404 Error</span>
      <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
        Destination Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
        The page or travel route you are looking for might have been moved or doesn't exist.
      </p>

      <div className="mt-8">
        <Link to="/dashboard">
          <Button variant="primary" size="lg" leftIcon={<Home className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </main>
  );
};
