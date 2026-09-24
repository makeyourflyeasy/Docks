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

  const defaultSrc = variant === 'icon' ? '/favicon.svg' : '/logo.svg';
  const activeLogo = customSrc !== undefined ? (customSrc || defaultSrc) : (globalLogo || defaultSrc);

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

  return (
    <img 
      src={defaultSrc} 
      alt="DPL Logo" 
      className={`${className} object-contain select-none`} 
    />
  );
};

export default Logo;
