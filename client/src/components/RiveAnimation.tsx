import React, { useState, useEffect } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

interface RiveAnimationProps {
  src: string;
  stateMachine?: string;
  artboard?: string;
  className?: string;
  input?: string;
  value?: boolean;
}

export default function RiveAnimation({ 
  src, 
  stateMachine, 
  artboard,
  className,
  input,
  value 
}: RiveAnimationProps) {
  const [fallback, setFallback] = useState(false);
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine ? [stateMachine] : undefined,
    artboard,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
    autoplay: true,
    onError: () => setFallback(true)
  });

  useEffect(() => {
    if (rive && input && value !== undefined && stateMachine) {
      try {
        const inputs = rive.stateMachineInputs(stateMachine);
        const booleanInput = inputs.find(i => i.name === input);
        if (booleanInput) {
          booleanInput.value = value;
        }
      } catch (error) {
        console.warn('Warning: Could not set Rive input value', error);
        setFallback(true);
      }
    }
  }, [rive, stateMachine, input, value]);

  if (fallback) {
    return (
      <div className={`${className} transition-transform duration-300`}>
        {value ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-full h-full"
          >
            <circle cx="12" cy="12" r="5" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <RiveComponent />
    </div>
  );
}
