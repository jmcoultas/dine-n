import type { Meta, StoryObj } from '@storybook/react';
import { PhysicalAddress, type AddressComponents } from './physical-address';
import { useState } from 'react';

const meta: Meta<typeof PhysicalAddress> = {
  title: 'UI/PhysicalAddress',
  component: PhysicalAddress,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A physical address input component with Google Maps Places API integration.

## Setup
To use this component, you need to:
1. Get a Google Maps API key from Google Cloud Console
2. Enable the Places API for your project
3. Set the environment variable \`VITE_GOOGLE_MAPS_API_KEY\` in your Replit project
4. Pass the API key to the component via the \`apiKey\` prop

## Features
- Real-time address suggestions
- Address component parsing (street, city, state, zip, coordinates)
- Country and place type restrictions
- Keyboard navigation
- Loading states and error handling
- Theme-compatible styling
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The current address value',
    },
    onChange: {
      action: 'changed',
      description: 'Callback fired when the address changes',
    },
    onPlaceSelected: {
      action: 'place-selected',
      description: 'Callback fired when a place is selected from suggestions',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the input',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    apiKey: {
      control: 'text',
      description: 'Google Maps API key (required)',
    },
    countries: {
      control: 'object',
      description: 'Array of country codes to restrict suggestions to',
    },
    types: {
      control: 'object',
      description: 'Array of place types to restrict suggestions to',
    },
    showClearButton: {
      control: 'boolean',
      description: 'Whether to show the clear button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PhysicalAddress>;

// Note: For these stories to work fully, you'll need to provide a real Google Maps API key
// Set VITE_GOOGLE_MAPS_API_KEY in your environment variables or Replit secrets
const DEMO_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCv1zRSzCkZLcSjqVzkpFjtH9FDvlBXRHk';

export const Default: Story = {
  args: {
    placeholder: 'Enter your address',
    apiKey: DEMO_API_KEY,
    showClearButton: true,
  },
};

export const WithoutApiKey: Story = {
  args: {
    placeholder: 'Enter your address (Google Maps API key required)',
    showClearButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the component behavior when no API key is provided. The input will be disabled and show a loading state.',
      },
    },
  },
};

export const USOnly: Story = {
  args: {
    placeholder: 'Enter US address',
    apiKey: DEMO_API_KEY,
    countries: ['us'],
    showClearButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Restricts address suggestions to United States only.',
      },
    },
  },
};

export const BusinessAddresses: Story = {
  args: {
    placeholder: 'Enter business address',
    apiKey: DEMO_API_KEY,
    types: ['establishment'],
    showClearButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Restricts suggestions to business establishments only.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    value: '123 Main St, New York, NY 10001',
    placeholder: 'Enter your address',
    disabled: true,
    apiKey: DEMO_API_KEY,
  },
};

export const Interactive: Story = {
  render: () => {
    const [address, setAddress] = useState('');
    const [components, setComponents] = useState<AddressComponents | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<any>(null);

    const handleAddressChange = (newAddress: string, addressComponents?: AddressComponents) => {
      setAddress(newAddress);
      if (addressComponents) {
        setComponents(addressComponents);
      }
    };

    const handlePlaceSelected = (place: any, addressComponents: AddressComponents) => {
      setSelectedPlace(place);
      setComponents(addressComponents);
    };

    return (
      <div className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Address
          </label>
          <PhysicalAddress
            value={address}
            onChange={handleAddressChange}
            onPlaceSelected={handlePlaceSelected}
            placeholder="Start typing an address..."
            apiKey={DEMO_API_KEY}
          />
        </div>
        
        <div className="text-sm space-y-2">
          <div>
            <span className="font-medium">Full Address:</span>
            <div className="text-muted-foreground font-mono text-xs bg-muted p-2 rounded mt-1">
              {address || 'None'}
            </div>
          </div>
          
          {components && (
            <div>
              <span className="font-medium">Address Components:</span>
              <div className="text-muted-foreground text-xs bg-muted p-2 rounded mt-1 space-y-1">
                {components.street_number && (
                  <div><span className="font-medium">Street Number:</span> {components.street_number}</div>
                )}
                {components.route && (
                  <div><span className="font-medium">Street:</span> {components.route}</div>
                )}
                {components.locality && (
                  <div><span className="font-medium">City:</span> {components.locality}</div>
                )}
                {components.administrative_area_level_1 && (
                  <div><span className="font-medium">State:</span> {components.administrative_area_level_1}</div>
                )}
                {components.postal_code && (
                  <div><span className="font-medium">ZIP:</span> {components.postal_code}</div>
                )}
                {components.country && (
                  <div><span className="font-medium">Country:</span> {components.country}</div>
                )}
                {components.geometry && (
                  <div><span className="font-medium">Coordinates:</span> {components.geometry.location.lat.toFixed(6)}, {components.geometry.location.lng.toFixed(6)}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing the component in action with real-time address parsing and component extraction.',
      },
    },
  },
};

export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      address: '',
      addressComponents: null as AddressComponents | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted:', formData);
      alert(`Form submitted with address: ${formData.address}`);
    };

    const handleAddressChange = (address: string, components?: AddressComponents) => {
      setFormData(prev => ({
        ...prev,
        address,
        addressComponents: components || null,
      }));
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Enter your name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Enter your email"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Address
          </label>
          <PhysicalAddress
            value={formData.address}
            onChange={handleAddressChange}
            placeholder="Enter your address"
            apiKey={DEMO_API_KEY}
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Submit
        </button>
      </form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of using the PhysicalAddress component in a form context.',
      },
    },
  },
};

export const ValidationExample: Story = {
  render: () => {
    const [address, setAddress] = useState('');
    const [components, setComponents] = useState<AddressComponents | null>(null);
    const [error, setError] = useState('');

    const validateAddress = (address: string, components?: AddressComponents) => {
      if (!address.trim()) {
        setError('Address is required');
        return false;
      }
      
      if (!components || !components.place_id) {
        setError('Please select a valid address from the suggestions');
        return false;
      }
      
      if (!components.street_number || !components.route) {
        setError('Please provide a complete street address');
        return false;
      }
      
      setError('');
      return true;
    };

    const handleAddressChange = (newAddress: string, addressComponents?: AddressComponents) => {
      setAddress(newAddress);
      setComponents(addressComponents || null);
      
      // Only validate if we have components (meaning a place was selected)
      if (addressComponents) {
        validateAddress(newAddress, addressComponents);
      }
    };

    const handlePlaceSelected = (place: any, addressComponents: AddressComponents) => {
      setComponents(addressComponents);
      validateAddress(address, addressComponents);
    };

    return (
      <div className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Address *
          </label>
          <PhysicalAddress
            value={address}
            onChange={handleAddressChange}
            onPlaceSelected={handlePlaceSelected}
            placeholder="Enter your address"
            apiKey={DEMO_API_KEY}
            className={error ? 'border-red-500' : ''}
          />
          {error && (
            <p className="text-sm text-red-500 mt-1">{error}</p>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Status: {error ? '❌ Invalid' : components ? '✅ Valid' : '⏳ Pending'}</div>
          <div>Has Place ID: {components?.place_id ? '✅ Yes' : '❌ No'}</div>
          <div>Complete Address: {components?.street_number && components?.route ? '✅ Yes' : '❌ No'}</div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example with validation to ensure a complete, valid address is selected.',
      },
    },
  },
};

export const MultipleCountries: Story = {
  render: () => {
    const [selectedCountries, setSelectedCountries] = useState(['us', 'ca']);
    const [address, setAddress] = useState('');

    return (
      <div className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Country Restrictions
          </label>
          <div className="flex gap-2 flex-wrap">
            {['us', 'ca', 'gb', 'au', 'de', 'fr'].map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => {
                  setSelectedCountries(prev => 
                    prev.includes(country) 
                      ? prev.filter(c => c !== country)
                      : [...prev, country]
                  );
                }}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedCountries.includes(country)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                {country.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Address
          </label>
          <PhysicalAddress
            value={address}
            onChange={setAddress}
            placeholder="Enter address"
            apiKey={DEMO_API_KEY}
            countries={selectedCountries}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <div>Restricted to: {selectedCountries.join(', ').toUpperCase()}</div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example showing how to dynamically restrict address suggestions to specific countries.',
      },
    },
  },
}; 