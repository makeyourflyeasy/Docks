import React, { useState } from 'react';
import { useBranding } from '../services/brandingService';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  customSrc?: string | null;
}

const Logo: React.FC<LogoProps> = ({ className = "", variant = 'full', customSrc }) => {
  const { customLogo: globalLogo, companyName } = useBranding();
  const [imgError, setImgError] = useState(false);

  const activeLogo = customSrc !== undefined ? customSrc : globalLogo;

  if (activeLogo && !imgError) {
    return (
      <img 
        src={activeLogo} 
        alt={companyName || "Company Logo"} 
        className={`${className} object-contain select-none transition-all duration-300`}
        onError={() => setImgError(true)}
      />
    );
  }

  const gradId = "dplGoldenTextGrad";

  return (
    <svg 
      viewBox={variant === 'icon' ? "0 0 120 70" : "0 0 180 70"}
      className={`${className} select-none overflow-visible`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Pure Premium Metallic Golden Gradient */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A3" />
          <stop offset="25%" stopColor="#F5D061" />
          <stop offset="50%" stopColor="#E5B22D" />
          <stop offset="75%" stopColor="#C99414" />
          <stop offset="100%" stopColor="#9C6B08" />
        </linearGradient>
        <filter id="dplGoldGleam" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      <text
        x="50%"
        y="52"
        textAnchor="middle"
        fill={`url(#${gradId})`}
        filter="url(#dplGoldGleam)"
        style={{
          fontFamily: "'Montserrat', 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize: variant === 'icon' ? '46px' : '52px',
          letterSpacing: '0.08em',
        }}
      >
        DPL
      </text>
    </svg>
  );
};

export default Logo;
