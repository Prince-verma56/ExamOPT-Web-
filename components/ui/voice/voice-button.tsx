"use client";

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { VoiceSessionState } from '@/ai/voice/interface';
import { cn } from '@/lib/utils';
import gsap from 'gsap';

interface VoiceButtonProps {
  state: VoiceSessionState;
  onClick: () => void;
  className?: string;
}

export function VoiceButton({ state, onClick, className }: VoiceButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!buttonRef.current) return;

    if (state === 'speaking' || state === 'listening') {
      gsap.to(buttonRef.current, {
        scale: 1.05,
        boxShadow: "0px 0px 15px rgba(var(--primary), 0.5)",
        repeat: -1,
        yoyo: true,
        duration: 0.8,
        ease: "sine.inOut"
      });
    } else {
      gsap.killTweensOf(buttonRef.current);
      gsap.to(buttonRef.current, {
        scale: 1,
        boxShadow: "0px 0px 0px rgba(var(--primary), 0)",
        duration: 0.3
      });
    }
  }, [state]);

  const getIcon = () => {
    switch (state) {
      case 'idle':
      case 'ended':
        return <Mic className="h-5 w-5" />;
      case 'connecting':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'active':
      case 'listening':
      case 'speaking':
        return <MicOff className="h-5 w-5" />;
      default:
        return <Mic className="h-5 w-5" />;
    }
  };

  const getVariant = () => {
    if (state === 'error') return 'destructive';
    if (state === 'active' || state === 'listening' || state === 'speaking') return 'default';
    return 'outline';
  };

  return (
    <Button
      ref={buttonRef}
      variant={getVariant()}
      size="icon"
      className={cn("rounded-full h-12 w-12 transition-colors", className)}
      onClick={onClick}
      aria-label="Toggle Voice Assistant"
    >
      {getIcon()}
    </Button>
  );
}
