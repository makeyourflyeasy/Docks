import React, { useEffect, useState, useRef } from 'react';
import Logo from './Logo';
import { useBranding } from '../services/brandingService';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { customLogo, companyName, subtitle } = useBranding();
  const [fadingOut, setFadingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasFinishedRef = useRef(false);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  useEffect(() => {
    // Trigger entrance animation immediately
    const enterTimer = requestAnimationFrame(() => {
      setMounted(true);
    });

    // Elegant presentation duration: display animated logo cleanly for ~2.4 seconds then transition smoothly
    const exitTimer = setTimeout(() => {
      handleFinish();
    }, 2400);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <div 
      onClick={handleFinish}
      role="button"
      tabIndex={0}
      aria-label="Welcome screen - Click or tap to continue to login"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 select-none bg-[#030712] transition-all duration-600 ease-out overflow-hidden cursor-pointer ${
        fadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes dplFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes dplPulseGlow {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.12);
          }
        }
        @keyframes dplOrbDrift1 {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(40px, -30px) scale(1.18);
          }
        }
        @keyframes dplOrbDrift2 {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(-45px, 35px) scale(1.15);
          }
        }
        @keyframes dplDustDrift {
          0% {
            transform: translateY(110vh) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.7;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-10vh) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes dplSpinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes dplReverseSpinSlow {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. BEAUTIFULLY ANIMATED AMBIENT BACKGROUND                    */}
      {/* ============================================================ */}
      
      {/* Subtle fine cyber-geometric constellation mesh */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 60%),
            linear-gradient(to right, rgba(56, 189, 248, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 50%, transparent 85%)'
        }}
      />

      {/* Deep Ambient Moving Orbs */}
      {/* Orb 1: Warm Golden Amber (Center-Top behind logo) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] sm:w-[640px] sm:h-[640px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.08) 40%, transparent 70%)',
          animation: 'dplOrbDrift1 14s ease-in-out infinite'
        }}
      />

      {/* Orb 2: Deep Cyan / Azure Glow (Bottom-Left) */}
      <div 
        className="absolute -bottom-24 -left-20 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(14, 116, 144, 0.04) 50%, transparent 70%)',
          animation: 'dplOrbDrift2 18s ease-in-out infinite'
        }}
      />

      {/* Orb 3: Royal Cobalt Glow (Top-Right) */}
      <div 
        className="absolute -top-20 -right-20 w-[440px] h-[440px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.13) 0%, rgba(30, 58, 138, 0.04) 50%, transparent 70%)',
          animation: 'dplOrbDrift1 20s ease-in-out infinite reverse'
        }}
      />

      {/* Rotating Ultra-Subtle Background Compass Rings */}
      <div 
        className="absolute w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-full border border-amber-500/10 border-dashed pointer-events-none"
        style={{ animation: 'dplSpinSlow 60s linear infinite' }}
      />
      <div 
        className="absolute w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] rounded-full border border-cyan-500/10 pointer-events-none"
        style={{ animation: 'dplReverseSpinSlow 45s linear infinite' }}
      />

      {/* Floating Luminous Particle Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { left: '12%', size: '3px', delay: '0s', duration: '7s' },
          { left: '25%', size: '2px', delay: '2.5s', duration: '9s' },
          { left: '38%', size: '3px', delay: '1s', duration: '6.5s' },
          { left: '52%', size: '2px', delay: '3.8s', duration: '8s' },
          { left: '68%', size: '3px', delay: '0.8s', duration: '7.5s' },
          { left: '82%', size: '2.5px', delay: '2.2s', duration: '8.5s' },
          { left: '92%', size: '3px', delay: '4s', duration: '6s' },
        ].map((dust, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]"
            style={{
              left: dust.left,
              bottom: 0,
              width: dust.size,
              height: dust.size,
              animation: `dplDustDrift ${dust.duration} ease-in-out infinite`,
              animationDelay: dust.delay
            }}
          />
        ))}
      </div>

      {/* ============================================================ */}
      {/* 2. DIRECT ANIMATED LOGO (NO SEPARATE CARD/BOX BACKGROUND)     */}
      {/* ============================================================ */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4 text-center">
        
        {/* Soft Radial Gold Halo Aura Directly Behind Logo (Not a card or box) */}
        <div 
          className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 70%)',
            animation: 'dplPulseGlow 3s ease-in-out infinite'
          }}
        />

        {/* Animated Logo Container - Sits directly on the screen's canvas */}
        <div 
          className={`relative transition-all duration-1000 ease-out transform ${
            mounted 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-90 translate-y-3'
          }`}
          style={{
            animation: mounted ? 'dplFloat 4s ease-in-out infinite' : undefined
          }}
        >
          {customLogo ? (
            <img 
              src={customLogo} 
              alt={companyName || "DOCKS Logo"} 
              className="w-64 sm:w-88 max-h-44 object-contain drop-shadow-[0_12px_32px_rgba(245,158,11,0.5)] filter brightness-110 select-none"
            />
          ) : (
            <div className="w-64 sm:w-96 drop-shadow-[0_14px_36px_rgba(245,158,11,0.45)] select-none">
              <Logo className="w-full h-auto" />
            </div>
          )}
        </div>

        {/* Corporate Typography Cleanly Positioned Below Logo */}
        <div 
          className={`text-center mt-6 space-y-2 transition-all duration-1000 delay-200 ease-out ${
            mounted 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
        >
          {(() => {
            const rawName = (companyName || '').trim();
            const isDocks = !rawName || rawName.toLowerCase().includes('docks');
            const formattedTitle = isDocks ? 'DOCKS (PVT) LTD.' : rawName.toUpperCase();
            return (
              <h1 
                className="text-2xl sm:text-4xl font-extrabold tracking-wider text-amber-300 uppercase drop-shadow-[0_2px_14px_rgba(245,158,11,0.7)] font-sans px-2"
                style={{ color: '#FCD34D', textShadow: '0 2px 14px rgba(245, 158, 11, 0.7)' }}
              >
                {formattedTitle}
              </h1>
            );
          })()}
          
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-10 sm:w-20 bg-gradient-to-r from-transparent to-amber-400/80" />
            <p 
              className="text-amber-400 tracking-[0.35em] text-[10px] sm:text-xs font-bold uppercase"
              style={{ color: '#FBBF24' }}
            >
              {subtitle || 'CUSTOMS BONDED CARRIER • ONE WINDOW LOGISTICS'}
            </p>
            <div className="h-px w-10 sm:w-20 bg-gradient-to-l from-transparent to-amber-400/80" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;
