import React, { useEffect } from 'react';
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
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine ? [stateMachine] : undefined,
    artboard,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
    autoplay: true
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
      }
    }
  }, [rive, stateMachine, input, value]);

  return (
    <div className={className}>
      <RiveComponent />
    </div>
  );
}
