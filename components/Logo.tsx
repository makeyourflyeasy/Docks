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

  const gradId = "dplMetallicGold";
  const stripeGradId = "dplStripeGold";
  const glowId = "dplGoldShadow";

  return (
    <svg 
      viewBox={variant === 'icon' ? "35 25 410 190" : "30 25 930 190"}
      className={`${className} overflow-visible`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Exact Multi-stop Metallic Gold Gradient from the uploaded logo image */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#FFF5B8" />
          <stop offset="12%" stopColor="#FCE182" />
          <stop offset="28%" stopColor="#EDB840" />
          <stop offset="48%" stopColor="#CCA026" />
          <stop offset="68%" stopColor="#F8DD7B" />
          <stop offset="85%" stopColor="#E2B438" />
          <stop offset="100%" stopColor="#B28014" />
        </linearGradient>

        <linearGradient id={stripeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DBAC33" />
          <stop offset="50%" stopColor="#FCE48D" />
          <stop offset="100%" stopColor="#C2921C" />
        </linearGradient>
      </defs>

      <g className="drop-shadow-[0_2px_4px_rgba(107,72,3,0.4)]">
        {/* Left 3 Speed Stripes */}
        <g>
          {/* Top Stripe (Longest) */}
          <path 
            d="M 45,36 L 215,36 L 203,62 L 45,62 Z" 
            fill={`url(#${stripeGradId})`} 
            stroke="#8C630D" 
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Middle Stripe (Medium) */}
          <path 
            d="M 45,80 L 180,80 L 168,106 L 45,106 Z" 
            fill={`url(#${stripeGradId})`} 
            stroke="#8C630D" 
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Bottom Stripe (Shortest) */}
          <path 
            d="M 45,124 L 145,124 L 133,150 L 45,150 Z" 
            fill={`url(#${stripeGradId})`} 
            stroke="#8C630D" 
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>

        {/* Letter 'D' with iconic stepped notch cutout and smooth outer curve */}
        <path
          fillRule="evenodd"
          d="
            M 265,36
            L 370,36
            C 415,36 442,65 442,105
            C 442,155 410,204 345,204
            L 145,204
            L 225,120
            L 280,120
            L 298,80
            L 245,80
            Z
            M 305,68
            L 345,68
            C 370,68 388,86 388,110
            C 388,142 368,172 335,172
            L 278,172
            L 302,144
            L 322,144
            L 332,102
            L 288,102
            Z
          "
          fill={`url(#${gradId})`}
          stroke="#8C630D"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {variant === 'full' && (
          <>
            {/* Letter 'P' with slanted stem and curved loop */}
            <path
              fillRule="evenodd"
              d="
                M 485,36
                L 580,36
                C 630,36 655,62 655,98
                C 655,134 628,152 575,152
                L 508,152
                L 482,204
                L 415,204
                Z
                M 522,68
                L 560,68
                C 585,68 600,80 600,98
                C 600,116 585,122 560,122
                L 498,122
                Z
              "
              fill={`url(#${gradId})`}
              stroke="#8C630D"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Letter 'L' - Upper Slanted Parallelogram */}
            <path
              d="
                M 685,36
                L 770,36
                L 715,132
                L 630,132
                Z
              "
              fill={`url(#${gradId})`}
              stroke="#8C630D"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Letter 'L' - Lower Aerodynamic Base Foot */}
            <path
              d="
                M 625,148
                C 605,148 595,160 595,176
                C 595,192 605,204 625,204
                L 770,204
                L 795,148
                Z
              "
              fill={`url(#${gradId})`}
              stroke="#8C630D"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Right 3 Speed Stripes */}
            <g>
              {/* Top Stripe */}
              <path 
                d="M 820,148 L 955,148 L 955,164 L 813,164 Z" 
                fill={`url(#${stripeGradId})`} 
                stroke="#8C630D" 
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Middle Stripe */}
              <path 
                d="M 808,168 L 955,168 L 955,184 L 801,184 Z" 
                fill={`url(#${stripeGradId})`} 
                stroke="#8C630D" 
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Bottom Stripe */}
              <path 
                d="M 796,188 L 955,188 L 955,204 L 789,204 Z" 
                fill={`url(#${stripeGradId})`} 
                stroke="#8C630D" 
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </g>
          </>
        )}
      </g>
    </svg>
  );
};

export default Logo;


