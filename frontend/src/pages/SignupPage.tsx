import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { User, Mail, Lock, Globe, ArrowRight } from "lucide-react";
import { Button } from "../components/Button";

type SignupErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

const validate = (name: string, email: string, password: string, confirmPassword: string): SignupErrors => {
  const errors: SignupErrors = {};
  if (!name.trim()) errors.name = "Full name is required.";
  if (!email.trim()) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Password is required.";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
};

export const SignupPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<SignupErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(name, email, password, confirmPassword);
    setErrors(validationErrors);
    setServerError("");
    if (Object.keys(validationErrors).length) return;

    setIsSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : "Unable to create your account right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8"
      aria-labelledby="signup-title"
    >
      <div className="flex items-center gap-2 lg:hidden mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
          <Globe className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold text-slate-900">GlobeTrotter</span>
      </div>

      <div className="space-y-1">
        <h1 id="signup-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Create your account
        </h1>
        <p className="text-sm text-slate-500">
          Join GlobeTrotter to plan, organize, and track your trips.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {serverError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700 font-medium">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="signup-name">
            Full Name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "signup-name-error" : undefined}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.name
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.name && (
            <span id="signup-name-error" className="mt-1 block text-xs font-medium text-rose-600">
              {errors.name}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="signup-email">
            Email address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "signup-email-error" : undefined}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.email
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.email && (
            <span id="signup-email-error" className="mt-1 block text-xs font-medium text-rose-600">
              {errors.email}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="signup-password">
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "signup-password-error" : undefined}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.password
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.password && (
            <span id="signup-password-error" className="mt-1 block text-xs font-medium text-rose-600">
              {errors.password}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="signup-confirm-password">
            Confirm password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "signup-confirm-password-error" : undefined}
              className={`block w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                errors.confirmPassword
                  ? "border-rose-300 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              }`}
            />
          </div>
          {errors.confirmPassword && (
            <span id="signup-confirm-password-error" className="mt-1 block text-xs font-medium text-rose-600">
              {errors.confirmPassword}
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
          Create account
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" state={location.state} className="font-semibold text-sky-700 hover:text-sky-800 hover:underline">
          Sign in
        </Link>
      </div>
    </section>
  );
};
