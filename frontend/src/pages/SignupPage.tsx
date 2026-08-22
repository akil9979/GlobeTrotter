import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";

type SignupErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

const validate = (name: string, email: string, password: string, confirmPassword: string): SignupErrors => {
  const errors: SignupErrors = {};
  if (!name.trim()) errors.name = "Name is required.";
  if (!email.trim()) errors.email = "Email is required.";
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
      setServerError(error instanceof ApiError && error.status < 500 ? error.message : "Unable to create your account right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="signup-title">
      <p className="text-sm font-semibold text-sky-700">GlobeTrotter</p>
      <h1 id="signup-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">Start organizing your next adventure.</p>
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {serverError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}
        <AuthField id="signup-name" label="Name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
        <AuthField id="signup-email" label="Email address" value={email} onChange={setEmail} error={errors.email} type="email" autoComplete="email" />
        <AuthField id="signup-password" label="Password" value={password} onChange={setPassword} error={errors.password} type="password" autoComplete="new-password" />
        <AuthField id="signup-confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} type="password" autoComplete="new-password" />
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link to="/login" state={location.state} className="font-medium text-sky-700 hover:text-sky-800">Log in</Link></p>
    </section>
  );
};

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "email" | "password" | "text";
  autoComplete: string;
}

const AuthField = ({ id, label, value, onChange, error, type = "text", autoComplete }: AuthFieldProps) => (
  <label className="block text-sm font-medium text-slate-700" htmlFor={id}>{label}
    <input id={id} name={id} type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    {error && <span id={`${id}-error`} className="mt-1 block text-sm text-red-600">{error}</span>}
  </label>
);
