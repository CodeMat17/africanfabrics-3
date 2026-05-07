"use client";

import { useEffect } from "react";
import { toast } from "sonner";

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
      width="40"
      height="40"
      className="shrink-0 rounded-full"
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
  useEffect(() => {
    if (isInstalled()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    let deferredPrompt: BeforeInstallPromptEvent | null = null;

    const handleInstall = async (toastId: string | number) => {
      if (!deferredPrompt) return;
      toast.dismiss(toastId);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      localStorage.setItem(DISMISSED_KEY, "1");
      deferredPrompt = null;
    };

    const handleDismiss = (toastId: string | number) => {
      toast.dismiss(toastId);
      localStorage.setItem(DISMISSED_KEY, "1");
    };

    const showToast = () => {
      const id = toast.custom(
        (toastId) => (
          <div className="flex items-start gap-3 w-full rounded-xl border border-emerald-200 bg-white dark:bg-zinc-900 dark:border-emerald-800 shadow-lg px-4 py-3">
            <NeedleIcon />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                Install AFD Guru
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                Add to your home screen for the best tailoring management
                experience — fast, full-screen, always ready.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleInstall(toastId)}
                  className="flex-1 rounded-lg bg-[#009f3b] hover:bg-[#007d2e] active:bg-[#005f22] text-white text-xs font-semibold py-1.5 px-3 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#009f3b]">
                  Install
                </button>
                <button
                  onClick={() => handleDismiss(toastId)}
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium py-1.5 px-3 transition-colors duration-150">
                  Not now
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: Infinity, position: "bottom-right" }
      );
      return id;
    };

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      showToast();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  return null;
}
