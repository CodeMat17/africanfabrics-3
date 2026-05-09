"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

function NeedleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="44"
      height="44"
      className="shrink-0 rounded-full shadow-md"
      aria-hidden="true">
      <circle cx="256" cy="256" r="256" fill="#009f3b" />
      <path
        d="M80 320 Q140 280 200 320 Q260 360 320 320 Q380 280 440 320 L440 400 Q380 360 320 400 Q260 440 200 400 Q140 360 80 400 Z"
        fill="#007d2e"
        opacity="0.7"
      />
      <rect
        x="238"
        y="100"
        width="22"
        height="210"
        rx="11"
        ry="11"
        fill="#ffffff"
        transform="rotate(-40 256 256)"
      />
      <ellipse
        cx="256"
        cy="148"
        rx="6"
        ry="9"
        fill="#009f3b"
        transform="rotate(-40 256 256)"
      />
      <path
        d="M 310 115 Q 295 100 275 118 Q 258 133 262 152 Q 266 170 280 168 Q 300 165 295 145 Q 290 128 275 130"
        fill="none"
        stroke="#ffd54f"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 275 130 Q 240 160 210 200 Q 185 235 195 270"
        fill="none"
        stroke="#ffd54f"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalled()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    setAnimateOut(true);
    localStorage.setItem(DISMISSED_KEY, "1");
    setTimeout(() => setVisible(false), 400);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    dismiss();
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes pwa-slide-down {
          from { opacity: 1; transform: translateY(0)   scale(1);    }
          to   { opacity: 0; transform: translateY(24px) scale(0.97); }
        }
        .pwa-card-enter { animation: pwa-slide-up   0.38s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .pwa-card-exit  { animation: pwa-slide-down 0.35s cubic-bezier(0.4,0,0.2,1)      forwards; }
        @keyframes pwa-pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(0,159,59,0.35); }
          70%  { box-shadow: 0 0 0 10px rgba(0,159,59,0);    }
          100% { box-shadow: 0 0 0 0   rgba(0,159,59,0);     }
        }
        .pwa-install-btn { animation: pwa-pulse-ring 2.2s ease-out infinite; }
      `}</style>

      <div
        role="dialog"
        aria-modal="false"
        aria-label="Install AFD Guru"
        className={`fixed bottom-5 right-4 z-9999 w-[calc(100vw-2rem)] max-w-sm ${animateOut ? "pwa-card-exit" : "pwa-card-enter"}`}>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl dark:border-emerald-900/60 dark:bg-zinc-900">
          {/* green top accent bar */}
          <div className="h-1 w-full bg-linear-to-r from-[#009f3b] via-[#00c44a] to-[#007d2e]" />

          {/* close button */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="flex items-start gap-3.5 px-4 pb-4 pt-3.5">
            <NeedleIcon />

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Install AFD Guru
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Add to your home screen for the best tailoring management
                experience — fast, full-screen, always ready.
              </p>

              <div className="mt-3.5 flex gap-2">
                <button
                  onClick={handleInstall}
                  className="pwa-install-btn flex-1 rounded-xl bg-[#009f3b] px-3 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#007d2e] active:bg-[#005f22] focus-visible:outline-2 focus-visible:outline-[#009f3b]">
                  Install app
                </button>
                <button
                  onClick={dismiss}
                  className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
