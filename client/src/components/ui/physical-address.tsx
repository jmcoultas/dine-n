import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MapPin, X } from "lucide-react";

// Google Maps types
declare global {
  interface Window {
    google: any;
    initAutocomplete: () => void;
  }
}

export interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country?: string;
  postal_code?: string;
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface PhysicalAddressProps {
  value?: string;
  onChange?: (address: string, components?: AddressComponents) => void;
  onPlaceSelected?: (place: any, components: AddressComponents) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  apiKey?: string;
  countries?: string[]; // Restrict to specific countries (e.g., ['us', 'ca'])
  types?: string[]; // Restrict to specific place types (e.g., ['address'])
  showClearButton?: boolean;
}

const PhysicalAddress = React.forwardRef<HTMLInputElement, PhysicalAddressProps>(
  (
    {
      value = "",
      onChange,
      onPlaceSelected,
      placeholder = "Enter your address",
      disabled = false,
      className,
      apiKey,
      countries = [],
      types = ['address'],
      showClearButton = true,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPredictions, setShowPredictions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteService = useRef<any>(null);
    const placesService = useRef<any>(null);
    const predictionsRef = useRef<HTMLDivElement>(null);

    // Load Google Maps API
    useEffect(() => {
      if (window.google && window.google.maps) {
        setIsGoogleLoaded(true);
        initializeServices();
        return;
      }

      if (!apiKey) {
        console.warn('Google Maps API key is required for PhysicalAddress component');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsGoogleLoaded(true);
        initializeServices();
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };

      document.head.appendChild(script);

      return () => {
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          document.head.removeChild(existingScript);
        }
      };
    }, [apiKey]);

    const initializeServices = () => {
      if (window.google && window.google.maps) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
      }
    };

    // Update input value when prop changes
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    const parseAddressComponents = (place: any): AddressComponents => {
      const components: AddressComponents = {
        formatted_address: place.formatted_address,
        place_id: place.place_id,
        geometry: place.geometry ? {
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        } : undefined
      };

      if (place.address_components) {
        place.address_components.forEach((component: any) => {
          const types = component.types;
          
          if (types.includes('street_number')) {
            components.street_number = component.long_name;
          }
          if (types.includes('route')) {
            components.route = component.long_name;
          }
          if (types.includes('locality')) {
            components.locality = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            components.administrative_area_level_1 = component.short_name;
          }
          if (types.includes('administrative_area_level_2')) {
            components.administrative_area_level_2 = component.long_name;
          }
          if (types.includes('country')) {
            components.country = component.long_name;
          }
          if (types.includes('postal_code')) {
            components.postal_code = component.long_name;
          }
        });
      }

      return components;
    };

    const fetchPredictions = async (input: string) => {
      if (!autocompleteService.current || !input.trim()) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);

      const request: any = {
        input: input.trim(),
        types: types
      };

      if (countries.length > 0) {
        request.componentRestrictions = { country: countries };
      }

      try {
        autocompleteService.current.getPlacePredictions(
          request,
          (predictions: any[], status: any) => {
            setIsLoading(false);
            
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setPredictions(predictions.slice(0, 5)); // Limit to 5 predictions
              setShowPredictions(true);
            } else {
              setPredictions([]);
              setShowPredictions(false);
            }
          }
        );
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setIsLoading(false);
        setPredictions([]);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setSelectedIndex(-1);
      
      if (onChange) {
        onChange(newValue);
      }

      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);

      return () => clearTimeout(timeoutId);
    };

    const handlePlaceSelect = (prediction: any) => {
      if (!placesService.current) return;

      setIsLoading(true);
      setShowPredictions(false);

      placesService.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['formatted_address', 'address_components', 'geometry', 'place_id']
        },
        (place: any, status: any) => {
          setIsLoading(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const formattedAddress = place.formatted_address;
            const components = parseAddressComponents(place);
            
            setInputValue(formattedAddress);
            
            if (onChange) {
              onChange(formattedAddress, components);
            }
            
            if (onPlaceSelected) {
              onPlaceSelected(place, components);
            }
          }
        }
      );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showPredictions || predictions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < predictions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handlePlaceSelect(predictions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowPredictions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    const handleClear = () => {
      setInputValue('');
      setPredictions([]);
      setShowPredictions(false);
      setSelectedIndex(-1);
      
      if (onChange) {
        onChange('');
      }
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleBlur = () => {
      // Delay hiding predictions to allow for click events
      setTimeout(() => {
        setShowPredictions(false);
        setSelectedIndex(-1);
      }, 200);
    };

    const handleFocus = () => {
      if (predictions.length > 0) {
        setShowPredictions(true);
      }
    };

    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled || !isGoogleLoaded}
            className={cn(
              "pl-10",
              showClearButton && inputValue && "pr-10"
            )}
            {...props}
          />
          
          {showClearButton && inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Predictions dropdown */}
        {showPredictions && predictions.length > 0 && (
          <div
            ref={predictionsRef}
            className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {predictions.map((prediction, index) => (
              <div
                key={prediction.place_id}
                onClick={() => handlePlaceSelect(prediction)}
                className={cn(
                  "px-4 py-2 cursor-pointer border-b border-border last:border-b-0 hover:bg-accent",
                  selectedIndex === index && "bg-accent"
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div className="text-xs text-muted-foreground truncate">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isGoogleLoaded && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
            <div className="text-sm text-muted-foreground">Loading Maps...</div>
          </div>
        )}
      </div>
    );
  }
);

PhysicalAddress.displayName = "PhysicalAddress";

export { PhysicalAddress }; 