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
  const { RiveComponent, setInputValue } = useRive({
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
    if (input && value !== undefined && stateMachine) {
      try {
        setInputValue(stateMachine, input, value);
      } catch (error) {
        console.error('Error setting Rive input value:', error);
      }
    }
  }, [stateMachine, input, value, setInputValue]);

  return (
    <div className={className}>
      <RiveComponent />
    </div>
  );
}
