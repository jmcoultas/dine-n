import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

interface RiveAnimationProps {
  src: string;
  stateMachine?: string;
  artboard?: string;
  className?: string;
}

export default function RiveAnimation({ 
  src, 
  stateMachine, 
  artboard,
  className 
}: RiveAnimationProps) {
  const { RiveComponent } = useRive({
    src,
    stateMachines: stateMachine ? [stateMachine] : undefined,
    artboard,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
  });

  return (
    <div className={className}>
      <RiveComponent />
    </div>
  );
}
