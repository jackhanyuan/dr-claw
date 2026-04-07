import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { SessionMode } from '../../../../types/app';

export interface SessionModeChoice {
  id: SessionMode;
  titleKey: string;
}

interface SessionModeSelectorProps {
  choices: SessionModeChoice[];
  activeMode: SessionMode;
  onSelect: (id: SessionMode) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export default function SessionModeSelector({
  choices,
  activeMode,
  onSelect,
  t,
}: SessionModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const activeChoice = choices.find((c) => c.id === activeMode) || choices[0];
  const getDotColor = (id: SessionMode) => id === 'research' ? 'bg-sky-500' : 'bg-emerald-500';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/50 text-[11px] font-medium transition-all duration-150 bg-primary/10 text-primary hover:bg-primary/15`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${getDotColor(activeChoice.id)}`} />
        <span>{t(activeChoice.titleKey)}</span>
        <svg className="w-3 h-3 text-primary/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 right-0 w-40 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {choices.map((choice) => {
            const active = activeMode === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => { onSelect(choice.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors ${
                  active
                    ? 'bg-primary/8 text-foreground font-medium'
                    : 'hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${getDotColor(choice.id)}`} />
                <span className="flex-1">{t(choice.titleKey)}</span>
                {active && <Check className="w-3 h-3 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
