import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Mail, Lock, Eye, EyeOff, Globe, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";

type LoginErrors = Partial<Record<"email" | "password", string>>;

const validate = (email: string, password: string): LoginErrors => {
  const errors: LoginErrors = {};
  if (!email.trim()) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Password is required.";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
};

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(email, password);
    setErrors(validationErrors);
    setServerError("");
    if (Object.keys(validationErrors).length) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : "Unable to log in right now. Please check your credentials and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8"
      aria-labelledby="login-title"
    >
      <div className="flex items-center gap-2 lg:hidden mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
          <Globe className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold text-slate-900">GlobeTrotter</span>
      </div>

      <div className="space-y-1">
        <h1 id="login-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500">
          Log in to manage your itineraries and planned journeys.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {serverError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700 font-medium">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="login-email">
            Email address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.email
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.email && (
            <span id="login-email-error" className="mt-1 block text-xs font-medium text-rose-600">
              {errors.email}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="login-password">
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              className={`block w-full rounded-xl border pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.password
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <span id="login-password-error" className="mt-1 block text-xs font-medium text-rose-600">
              {errors.password}
            </span>
          )}
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
          className="w-full mt-2"
          size="lg"
        >
          Sign in
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
        New to GlobeTrotter?{" "}
        <Link to="/signup" state={location.state} className="font-semibold text-sky-700 hover:text-sky-800 hover:underline">
          Create an account
        </Link>
      </div>
    </section>
  );
};
