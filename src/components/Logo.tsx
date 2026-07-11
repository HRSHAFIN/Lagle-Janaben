import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8 w-8" }: LogoProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left 'L' in brand dark navy */}
      <path 
        d="M 24 20 L 36 20 L 36 72 L 49 72 L 49 82 L 24 82 Z" 
        fill="#1E2D44" 
      />
      {/* Right stylized bracket 'J' in brand gold */}
      <path 
        d="M 53 20 L 78 20 L 78 82 L 53 82 L 53 72 L 66 72 L 66 30 L 53 30 Z" 
        fill="#B88E4C" 
      />
    </svg>
  );
}
