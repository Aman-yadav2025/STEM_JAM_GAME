import type { ReactNode } from 'react';

interface CornerFrameProps {
  children: ReactNode;
  className?: string;
  accent?: string; // hex color for corner brackets
}


export function CornerFrame({ children, className = '', accent = '#4FB4E8' }: CornerFrameProps) {
  const bracket = 'absolute w-3 h-3 border-solid';
  return (
    <div className={`relative bg-[#0A0E14]/85 backdrop-blur-sm border border-white/10 px-5 py-4 ${className}`}>
      <span className={`${bracket} top-0 left-0 border-t-2 border-l-2 -translate-x-px -translate-y-px`} style={{ borderColor: accent }} />
      <span className={`${bracket} top-0 right-0 border-t-2 border-r-2 translate-x-px -translate-y-px`} style={{ borderColor: accent }} />
      <span className={`${bracket} bottom-0 left-0 border-b-2 border-l-2 -translate-x-px translate-y-px`} style={{ borderColor: accent }} />
      <span className={`${bracket} bottom-0 right-0 border-b-2 border-r-2 translate-x-px translate-y-px`} style={{ borderColor: accent }} />
      {children}
    </div>
  );
}