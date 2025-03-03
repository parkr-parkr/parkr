"use client";

import * as React from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Prediction {
  description: string;
  place_id: string;
}

export function LocationSearch() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [predictions, setPredictions] = React.useState<Prediction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const autocompleteService = React.useRef<google.maps.places.AutocompleteService | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load Google Maps JavaScript API
  React.useEffect(() => {
    if (!window.google && !scriptLoaded) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        setScriptLoaded(true);
      };
      script.onerror = () => {
        setError("Failed to load Google Maps API");
      };
      document.head.appendChild(script);
    } else if (window.google && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      setScriptLoaded(true);
    }
  }, []);

  // Handle input changes and fetch predictions
  const handleInputChange = React.useCallback(async (input: string) => {
    setLoading(true);
    setError(null);
    setValue(input);

    if (!input.trim()) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    if (!autocompleteService.current) {
      setError("Places API not loaded");
      setLoading(false);
      return;
    }

    try {
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.current?.getPlacePredictions(
          {
            input: input,
            componentRestrictions: { country: "us" },
            types: ["address"],
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              reject(new Error("Failed to fetch predictions"));
            }
          },
        );
      });

      setPredictions(
        response.map((prediction) => ({
          description: prediction.description,
          place_id: prediction.place_id,
        })),
      );
      // Only open if we have predictions
      if (response.length > 0) {
        setOpen(true);
      }
    } catch (err) {
      setError("Failed to fetch address suggestions");
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce the input to prevent too many API calls
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value) handleInputChange(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, handleInputChange]);

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      // Enhance handling to prevent popover from closing when there are predictions
      if (!newOpen && predictions.length > 0) {
        setOpen(true);
      } else {
        setOpen(newOpen);
      }
    }}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            placeholder="Search locations..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full"
            onFocus={() => {
              // Only open if we have predictions
              if (predictions.length > 0) {
                setOpen(true);
              }
            }}
          />
          <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transform opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popper-anchor-width)] p-0"
        align="start"
        onPointerDownOutside={(e) => {
          // Prevent the popover from closing when clicking predictions
          if (e.target instanceof Element && e.target.closest(".predictions-container")) {
            e.preventDefault();
          }
        }}
      >
        <div className="rounded-md bg-popover predictions-container">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {error && <div className="p-4 text-sm text-red-500">{error}</div>}
          {!loading && !error && predictions.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No results found.</div>
          )}
          {!loading && !error && predictions.length > 0 && (
            <div className="flex flex-col">
              {predictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  className="flex items-center gap-2 rounded-sm px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    setValue(prediction.description);
                    setPredictions([]);
                    setOpen(false);
                  }}
                  onMouseDown={(e) => {
                    // Prevent the button from stealing focus
                    e.preventDefault();
                  }}
                >
                  <MapPin className="h-4 w-4" />
                  {prediction.description}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
