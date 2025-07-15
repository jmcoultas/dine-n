import type { Meta, StoryObj } from '@storybook/react';
import { PhoneInput } from './phone-input';
import { useState } from 'react';

const meta = {
  title: 'UI/PhoneInput',
  component: PhoneInput,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The full phone number value including country code',
    },
    onChange: {
      action: 'changed',
      description: 'Callback fired when the phone number changes',
    },
    onCountryChange: {
      action: 'country-changed',
      description: 'Callback fired when the country selection changes',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the phone number input',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    defaultCountry: {
      control: 'select',
      options: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'IN'],
      description: 'Default country code',
    },
  },
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter phone number',
    defaultCountry: 'US',
  },
};

export const LightMode: Story = {
  parameters: {
    backgrounds: { default: 'light' },
  },
  render: () => (
    <div className="p-6 bg-background text-foreground rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Light Mode</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Phone Number
          </label>
          <PhoneInput
            defaultCountry="US"
            placeholder="Enter your phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            UK Phone Number
          </label>
          <PhoneInput
            defaultCountry="GB"
            placeholder="Enter UK phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            German Phone Number
          </label>
          <PhoneInput
            defaultCountry="DE"
            placeholder="Enter German phone number"
          />
        </div>
      </div>
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <div className="p-6 bg-background text-foreground rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Dark Mode</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Phone Number
          </label>
          <PhoneInput
            defaultCountry="US"
            placeholder="Enter your phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            UK Phone Number
          </label>
          <PhoneInput
            defaultCountry="GB"
            placeholder="Enter UK phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            German Phone Number
          </label>
          <PhoneInput
            defaultCountry="DE"
            placeholder="Enter German phone number"
          />
        </div>
      </div>
    </div>
  ),
};

export const WithValue: Story = {
  args: {
    value: '+1234567890',
    placeholder: 'Enter phone number',
  },
};

export const DifferentCountries: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <div>
        <label className="block text-sm font-medium mb-2">United States</label>
        <PhoneInput defaultCountry="US" placeholder="(555) 123-4567" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">United Kingdom</label>
        <PhoneInput defaultCountry="GB" placeholder="20 7946 0958" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Germany</label>
        <PhoneInput defaultCountry="DE" placeholder="30 12345678" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Japan</label>
        <PhoneInput defaultCountry="JP" placeholder="3-1234-5678" />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: '+1234567890',
    placeholder: 'Enter phone number',
  },
};

export const Interactive: Story = {
  render: () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('US');

    return (
      <div className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Phone Number
          </label>
          <PhoneInput
            value={phoneNumber}
            onChange={setPhoneNumber}
            onCountryChange={setSelectedCountry}
            placeholder="Enter your phone number"
          />
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Full number: <span className="font-mono">{phoneNumber || 'None'}</span></div>
          <div>Selected country: <span className="font-mono">{selectedCountry}</span></div>
        </div>
      </div>
    );
  },
};

export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted:', formData);
      alert(`Form submitted with phone: ${formData.phone}`);
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
            Phone Number
          </label>
          <PhoneInput
            value={formData.phone}
            onChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
            placeholder="Enter your phone number"
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
};

export const ValidationExample: Story = {
  render: () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');

    const validatePhone = (phone: string) => {
      if (!phone) {
        setError('Phone number is required');
        return false;
      }
      if (phone.length < 10) {
        setError('Phone number is too short');
        return false;
      }
      if (phone.length > 15) {
        setError('Phone number is too long');
        return false;
      }
      setError('');
      return true;
    };

    const handlePhoneChange = (phone: string) => {
      setPhoneNumber(phone);
      validatePhone(phone);
    };

    return (
      <div className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Phone Number *
          </label>
          <PhoneInput
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="Enter your phone number"
            className={error ? 'border-red-500' : ''}
          />
          {error && (
            <p className="text-sm text-red-500 mt-1">{error}</p>
          )}
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Status: {error ? '❌ Invalid' : phoneNumber ? '✅ Valid' : '⏳ Pending'}</div>
          <div>Length: {phoneNumber.length} characters</div>
        </div>
      </div>
    );
  },
};

export const ThemeComparison: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
      {/* Light Mode */}
      <div className="p-6 bg-white text-gray-900 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Light Mode</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <PhoneInput
              defaultCountry="US"
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              International
            </label>
            <PhoneInput
              defaultCountry="GB"
              placeholder="Enter UK phone number"
            />
          </div>
        </div>
      </div>

      {/* Dark Mode */}
      <div className="p-6 bg-gray-900 text-gray-100 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Dark Mode</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <PhoneInput
              defaultCountry="US"
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              International
            </label>
            <PhoneInput
              defaultCountry="GB"
              placeholder="Enter UK phone number"
            />
          </div>
        </div>
      </div>
    </div>
  ),
}; 