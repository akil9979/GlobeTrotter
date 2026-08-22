import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import {
  User,
  Mail,
  Image as ImageIcon,
  Globe,
  Search,
  Bookmark,
  Trash2,
  AlertTriangle,
  MapPin,
  Plus,
  Check,
} from "lucide-react";

type City = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  image: string | null;
};
type SavedCity = City & { savedDestinationId: string; savedAt: string };

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

export const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileImage, setProfileImage] = useState(user?.profileImage ?? "");
  const [language, setLanguage] = useState(user?.language ?? "en");
  const [saved, setSaved] = useState<SavedCity[] | null>(null);
  const [results, setResults] = useState<City[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setProfileImage(user.profileImage ?? "");
      setLanguage(user.language);
    }
  }, [user]);

  const loadSaved = async () => {
    try {
      setSaved((await apiClient<{ destinations: SavedCity[] }>("/saved-destinations")).destinations);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load saved destinations.");
    }
  };

  useEffect(() => {
    void loadSaved();
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    const nextEmail = email.trim();
    if (!nextName) return setError("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail))
      return setError("Enter a valid email address.");
    if (profileImage) {
      try {
        new URL(profileImage);
      } catch {
        return setError("Enter a valid profile image URL.");
      }
    }
    setSaving(true);
    setError(null);
    try {
      await updateUser({
        name: nextName,
        email: nextEmail,
        profileImage: profileImage || null,
        language,
      });
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "Unable to save profile changes."
      );
    } finally {
      setSaving(false);
    }
  };

  const searchCities = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return setResults([]);
    setError(null);
    try {
      setResults(
        (await apiClient<{ cities: City[] }>(`/cities?search=${encodeURIComponent(query)}&limit=8`))
          .cities
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to search cities.");
    }
  };

  const saveCity = async (cityId: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiClient<{ destinations: SavedCity[] }>(
        `/saved-destinations/${cityId}`,
        { method: "POST" }
      );
      setSaved(response.destinations);
      setResults([]);
      setQuery("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save destination.");
    } finally {
      setSaving(false);
    }
  };

  const removeCity = async (cityId: string) => {
    setSaving(true);
    setError(null);
    try {
      await apiClient(`/saved-destinations/${cityId}`, { method: "DELETE" });
      setSaved((current) => current?.filter((city) => city.id !== cityId) ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove destination.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiClient<void>("/auth/me", { method: "DELETE" });
      logout();
      navigate("/signup", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete account.");
      setDeleting(false);
    }
  };

  if (!user) return <LoadingState label="Loading account profile..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Account Preferences</span>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Profile & Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your traveler profile, preferred language, and bookmarked destinations.
        </p>
      </div>

      {error && <ErrorState message={error} />}

      {/* Personal Details Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-md">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl font-extrabold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="profile-name">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="profile-email">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="profile-image">
                Avatar Image URL <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <input
                  id="profile-image"
                  type="url"
                  placeholder="https://..."
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="profile-lang">
                Preferred Language
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Globe className="h-4 w-4" />
                </div>
                <select
                  id="profile-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {languages.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Profile
            </Button>
          </div>
        </form>
      </section>

      {/* Saved Destinations Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-sky-600" /> Saved Destinations
          </h2>
          <p className="text-xs text-slate-500">Keep a personal shortlist of dream destinations.</p>
        </div>

        <form onSubmit={searchCities} className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search and bookmark cities..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <Button variant="secondary" size="sm" type="submit" disabled={saving}>
            Search
          </Button>
        </form>

        {results.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 p-1">
            {results.map((city) => {
              const isAlreadySaved = Boolean(saved?.some((item) => item.id === city.id));
              return (
                <div key={city.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{city.name}</p>
                    <p className="text-xs text-slate-500">
                      {city.country} {city.region ? `• ${city.region}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving || isAlreadySaved}
                    leftIcon={isAlreadySaved ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Plus className="h-3.5 w-3.5" />}
                    onClick={() => void saveCity(city.id)}
                  >
                    {isAlreadySaved ? "Saved" : "Save"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {saved === null ? (
          <LoadingState label="Loading saved destinations..." />
        ) : saved.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((city) => (
              <article
                key={city.id}
                className="flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200/80 p-3 bg-slate-50/50 hover:bg-white transition-all shadow-subtle"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                  {city.image ? (
                    <img src={city.image} alt={city.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{city.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{city.country}</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-600" />}
                  onClick={() => void removeCity(city.id)}
                  className="hover:bg-rose-50"
                />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved destinations"
            description="Search for a city above and save it to your personal shortlist."
          />
        )}
      </section>

      {/* Danger Zone: Delete Account */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-900 font-bold text-lg">
          <AlertTriangle className="h-5 w-5 text-rose-600" /> Delete Account
        </div>
        <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">
          Permanently remove your GlobeTrotter profile, trip itineraries, and saved destinations. This action is irreversible.
        </p>
        <div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete Account
          </Button>
        </div>
      </section>

      {/* Account Deletion Confirmation Dialog */}
      <Modal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete Account?"
        description="This will permanently delete your account and all associated trip data. Are you absolutely sure?"
        confirmText="Confirm Deletion"
        onConfirm={deleteAccount}
        isConfirming={deleting}
        variant="danger"
      />
    </div>
  );
};
