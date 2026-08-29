import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useI18n } from "@/lib/i18n";

export type PlaceResult = { label: string; sublabel: string; lat: number; lng: number };

// Free OpenStreetMap geocoder — no API key, same one already used elsewhere
// in this app. jsonv2 gives us a splittable display_name for label/sublabel.
async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const results = (await res.json()) as {
    display_name: string;
    name?: string;
    lat: string;
    lon: string;
  }[];
  return results.map((r) => {
    const parts = r.display_name.split(", ");
    const label = r.name || parts[0];
    const sublabel = parts.slice(label === parts[0] ? 1 : 0).join(", ");
    return { label, sublabel, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
  });
}

export function LocationSearchField({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: PlaceResult) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchPlaces(query);
        setResults(found);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => value.trim().length >= 3 && setOpen(true)}
            placeholder={t("admin.search_place_placeholder")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading && (
              <div className="py-4 text-center text-sm text-muted-foreground">{t("common.searching")}</div>
            )}
            {!loading && value.trim().length > 0 && value.trim().length < 3 && (
              <div className="py-4 text-center text-xs text-muted-foreground">{t("common.keep_typing")}</div>
            )}
            {!loading && value.trim().length >= 3 && results.length === 0 && (
              <CommandEmpty>{t("admin.no_places_found")}</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((r, i) => (
                <CommandItem
                  key={`${r.label}-${i}`}
                  value={`${r.label}-${i}`}
                  onSelect={() => {
                    onSelect(r);
                    setOpen(false);
                  }}
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">{r.label}</div>
                    {r.sublabel && (
                      <div className="text-xs text-muted-foreground truncate">{r.sublabel}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
