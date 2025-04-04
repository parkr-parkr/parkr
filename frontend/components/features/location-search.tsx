import * as React from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/shadcn/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";

interface Prediction {
  displayName: string, 
  formattedAddress: string,
  place_id:  string
}

interface LocationSearchProps {
  onLocationSelect?: (location: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [userLocation, setUserLocation] = React.useState<{ lat: number, lng: number } | null>(null)
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [predictions, setPredictions] = React.useState<Prediction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Get the user's current location using the Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          setError("Failed to get user location.")
        }
      )
    } else {
      setError("Geolocation is not supported by this browser.")
    }
  }, [])

  // Load Google Maps JavaScript API
  React.useEffect(() => {
    if (!window.google && !scriptLoaded) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true); // Set the script as loaded when the API is ready
      };
      script.onerror = () => {
        setError("Failed to load Google Maps API");
      };
      document.head.appendChild(script);
    }
  }, [scriptLoaded]);

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

    if (!window.google || !window.google.maps.places) {
      setError("Places API not loaded");
      setLoading(false);
      return;
    }

    try {
      // Create a session token for the request
      const sessionToken = new window.google.maps.places.AutocompleteSessionToken();

      let request = {
        input: input,
        language: "en-US",
        region: "us",
        sessionToken: sessionToken
    };


      // Fetch predictions using AutocompleteSuggestion
      const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      const placeDetails = [];

      // Loop through all the suggestions to fetch place details for each
      for (let suggestion of suggestions) {
        const place = suggestion.placePrediction.toPlace();

        try {
          // Fetch the place details
          await place.fetchFields({
            fields: ["displayName", "formattedAddress"], // You can add more fields as needed
          });

          // Store the fetched details
          placeDetails.push({
            displayName: place.displayName, 
            formattedAddress: place.formattedAddress,
            place_id: suggestion.placePrediction.place_id, // You can store additional fields if needed
          });
        } catch (error) {
          console.error(`Error fetching details for place with id ${suggestion.placePrediction.place_id}:`, error);
        }
      }

      // Now `placeDetails` contains the details for all suggestions
      console.log("Fetched Place Details for all suggestions:", placeDetails);
      
      setPredictions(
        [...placeDetails] 
      );

      console.log(predictions)

      // Only open if we have predictions
      if (suggestions.length > 0) {
        setOpen(true);
      }
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch address suggestions");
      setPredictions([]);
      console.log(err)
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

  const handleSelectLocation = async (prediction: Prediction) => {
    setValue(prediction.formattedAddress);
    setPredictions([]);
    setOpen(false);

    // Fetch the place details using Place and Place ID
    try {
 
      if (onLocationSelect) {
        onLocationSelect(prediction.place_id);
      }
    } catch (error) {
      setError("Failed to fetch place details");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        // Enhance handling to prevent popover from closing when there are predictions
        if (!newOpen && predictions.length > 0) {
          setOpen(true);
        } else {
          setOpen(newOpen);
        }
      }}
    >
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
                  onClick={() => handleSelectLocation(prediction)}
                  onMouseDown={(e) => {
                    // Prevent the button from stealing focus
                    e.preventDefault();
                  }}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate" style={{ maxWidth: "calc(100% - 30px)" }}>
                    {prediction.formattedAddress}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}