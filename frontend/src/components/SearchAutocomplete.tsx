import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { apiClient } from "../api/client";
import { Search, Loader2, MapPin, X, ArrowRight } from "lucide-react";
import { Badge } from "./Badge";

export type CityResult = {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  description?: string | null;
  image?: string | null;
  costIndex?: string | number | null;
  popularity?: number | null;
};

interface SearchAutocompleteProps {
  placeholder?: string;
  value?: string;
  onSearchChange?: (val: string) => void;
  onSelectCity?: (city: CityResult) => void;
  className?: string;
  autoFocus?: boolean;
}

export const SearchAutocomplete = ({
  placeholder = "Search destinations (e.g. Tok for Tokyo, Rom for Rome)...",
  value = "",
  onSearchChange,
  onSelectCity,
  className = "",
  autoFocus = false,
}: SearchAutocompleteProps) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state if prop value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      apiClient<{ cities: CityResult[] }>(
        `/cities?search=${encodeURIComponent(trimmed)}&limit=6`
      )
        .then((res) => {
          setSuggestions(res.cities || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        })
        .catch((err) => {
          console.error("Autocomplete search error:", err);
          setSuggestions([]);
        })
        .finally(() => setIsSearching(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (newVal: string) => {
    setQuery(newVal);
    if (onSearchChange) onSearchChange(newVal);
  };

  const handleSelect = (city: CityResult) => {
    setQuery(city.name);
    setIsOpen(false);
    if (onSearchChange) onSearchChange(city.name);
    if (onSelectCity) onSelectCity(city);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper to highlight matching typed query text substring
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-amber-100 text-amber-900 font-black px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-slate-400">
          <Search className="h-4 w-4" />
        </div>

        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 && query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all shadow-subtle font-medium"
        />

        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          ) : query ? (
            <button
              type="button"
              onClick={() => handleChange("")}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Real-time Suggestions Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-floating backdrop-blur-md animate-in fade-in-50 slide-in-from-top-1">
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Live Backend Suggestions ({suggestions.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Use ↑ ↓ & Enter</span>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 flex flex-col items-center gap-1.5">
              <MapPin className="h-6 w-6 text-slate-300" />
              <span>No cities found matching "{query}"</span>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {suggestions.map((city, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={city.id}
                    onClick={() => handleSelect(city)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-sky-50/90 text-sky-900" : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                        {city.image ? (
                          <img
                            src={city.image}
                            alt={city.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-100">
                            <MapPin className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 group-hover:text-sky-700 flex items-center gap-2">
                          {renderHighlightedText(city.name, query)}
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                          {city.region && <span>{city.region}, </span>}
                          <span>{renderHighlightedText(city.country, query)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="sky" size="sm" className="font-semibold">
                        {city.country}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
