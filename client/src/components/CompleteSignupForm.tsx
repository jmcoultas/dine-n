import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';

interface CompleteSignupFormProps {
  email: string;
  onSubmit: (data: { email: string; password: string; confirmPassword: string; name: string }) => Promise<void>;
  error?: string;
}

// Password validation criteria
const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export function CompleteSignupForm({ email, onSubmit, error }: CompleteSignupFormProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(error);
  const [passwordsMismatch, setPasswordsMismatch] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Check password strength and update validation errors
  const checkPasswordStrength = (password: string) => {
    const errors = {
      length: password.length >= MIN_LENGTH,
      uppercase: HAS_UPPERCASE.test(password),
      lowercase: HAS_LOWERCASE.test(password),
      number: HAS_NUMBER.test(password),
      special: HAS_SPECIAL.test(password)
    };
    
    setValidationErrors(errors);
    
    // Calculate strength as percentage (0-100)
    const validCriteriaCount = Object.values(errors).filter(Boolean).length;
    const strengthPercentage = (validCriteriaCount / 5) * 100;
    setPasswordStrength(strengthPercentage);
    
    return validCriteriaCount === 5; // All criteria met
  };

  // Clear form error when error prop changes
  useEffect(() => {
    setFormError(error);
  }, [error]);

  // Check if passwords match and validate strength whenever password changes
  useEffect(() => {
    if (password) {
      checkPasswordStrength(password);
    }
    
    if (password && confirmPassword) {
      setPasswordsMismatch(password !== confirmPassword);
    } else {
      setPasswordsMismatch(false);
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading || submitted) {
      return;
    }
    
    // Check terms acceptance
    if (!acceptedTerms) {
      setFormError('You must accept the Terms and Conditions to complete registration');
      return;
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setPasswordsMismatch(true);
      setFormError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    const isStrongPassword = checkPasswordStrength(password);
    if (!isStrongPassword) {
      setFormError('Please ensure your password meets all the requirements');
      return;
    }
    
    setIsLoading(true);
    setFormError('');
    setSubmitted(true);
    
    try {
      await onSubmit({
        email,
        password,
        confirmPassword,
        name
      });
      // Don't update state after successful submission
      // as the component will unmount on redirect
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      setSubmitted(false);
    }
  };

  // Get color for password strength meter
  const getStrengthColor = () => {
    if (passwordStrength <= 20) return "bg-red-500";
    if (passwordStrength <= 40) return "bg-orange-500";
    if (passwordStrength <= 60) return "bg-yellow-500";
    if (passwordStrength <= 80) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter your full name"
          disabled={isLoading || submitted}
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="bg-gray-50"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your email has been verified
        </p>
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={passwordsMismatch ? "border-red-500" : ""}
          disabled={isLoading || submitted}
        />
        
        {password.length > 0 && !submitted && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1">
              <Progress 
                value={passwordStrength} 
                className={`h-2 ${getStrengthColor()}`}
              />
              <span className="text-xs font-medium ml-2">
                {passwordStrength <= 20 && "Very Weak"}
                {passwordStrength > 20 && passwordStrength <= 40 && "Weak"}
                {passwordStrength > 40 && passwordStrength <= 60 && "Medium"}
                {passwordStrength > 60 && passwordStrength <= 80 && "Strong"}
                {passwordStrength > 80 && "Very Strong"}
              </span>
            </div>
            
            <ul className="text-xs space-y-1">
              <li className="flex items-center gap-1">
                {validationErrors.length ? 
                  <Check className="h-3 w-3 text-green-500" /> : 
                  <X className="h-3 w-3 text-red-500" />
                }
                At least {MIN_LENGTH} characters
              </li>
              <li className="flex items-center gap-1">
                {validationErrors.uppercase ? 
                  <Check className="h-3 w-3 text-green-500" /> : 
                  <X className="h-3 w-3 text-red-500" />
                }
                Contains uppercase letter
              </li>
              <li className="flex items-center gap-1">
                {validationErrors.lowercase ? 
                  <Check className="h-3 w-3 text-green-500" /> : 
                  <X className="h-3 w-3 text-red-500" />
                }
                Contains lowercase letter
              </li>
              <li className="flex items-center gap-1">
                {validationErrors.number ? 
                  <Check className="h-3 w-3 text-green-500" /> : 
                  <X className="h-3 w-3 text-red-500" />
                }
                Contains number
              </li>
              <li className="flex items-center gap-1">
                {validationErrors.special ? 
                  <Check className="h-3 w-3 text-green-500" /> : 
                  <X className="h-3 w-3 text-red-500" />
                }
                Contains special character
              </li>
            </ul>
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className={passwordsMismatch ? "border-red-500" : ""}
          disabled={isLoading || submitted}
        />
        {passwordsMismatch && (
          <p className="text-xs text-red-500 mt-1">
            Passwords don't match
          </p>
        )}
      </div>

      {/* Terms and Conditions checkbox */}
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            className="mt-1"
            disabled={isLoading || submitted}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms and Conditions
              </Link>
            </Label>
            <p className="text-xs text-muted-foreground">
              By creating an account, you acknowledge that you understand our AI-generated content is for informational purposes only and you will exercise your own judgment regarding food safety and dietary decisions.
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || submitted || passwordsMismatch || passwordStrength < 80 || !acceptedTerms}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Account...
          </span>
        ) : submitted ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting...
          </span>
        ) : (
          'Complete Registration'
        )}
      </Button>
    </form>
  );
} 