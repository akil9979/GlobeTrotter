import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";

type LoginErrors = Partial<Record<"email" | "password", string>>;

const validate = (email: string, password: string): LoginErrors => {
  const errors: LoginErrors = {};
  if (!email.trim()) errors.email = "Email is required.";
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
      setServerError(error instanceof ApiError && error.status < 500 ? error.message : "Unable to log in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="login-title">
      <p className="text-sm font-semibold text-sky-700">GlobeTrotter</p>
      <h1 id="login-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-600">Log in to continue planning your next trip.</p>
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {serverError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}
        <label className="block text-sm font-medium text-slate-700" htmlFor="login-email">Email address
          <input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          {errors.email && <span id="login-email-error" className="mt-1 block text-sm text-red-600">{errors.email}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="login-password">Password
          <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          {errors.password && <span id="login-password-error" className="mt-1 block text-sm text-red-600">{errors.password}</span>}
        </label>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">New to GlobeTrotter? <Link to="/signup" state={location.state} className="font-medium text-sky-700 hover:text-sky-800">Create an account</Link></p>
    </section>
  );
};
