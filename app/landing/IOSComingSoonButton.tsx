"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";

function AppleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 fill-current"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.33-.08 2.26.73 3.04.73.76 0 2.19-.97 3.69-.83.63.03 2.39.25 3.52 1.91-3.04 1.66-2.56 5.66.53 6.9-.62 1.63-1.42 3.25-2.78 4.26ZM12.03 7.25C11.88 4.83 13.83 2.84 16.09 2.64c.31 2.79-2.53 4.87-4.06 4.61Z" />
    </svg>
  );
}

export default function IOSComingSoonButton() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        className="group inline-flex h-14 items-center gap-3 rounded-full border border-[#eee4d5] bg-[#fff8ec] px-7 text-[15px] font-bold text-[#173c35] shadow-[0_18px_30px_-18px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-white"
      >
        <AppleMark />
        Download for iOS
      </button>

      {isVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-5 right-5 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-white/20 bg-[#173c35] p-4 text-left text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)] sm:left-auto sm:right-6"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#53d1af] text-[#173c35]">
            <Sparkles aria-hidden="true" size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">iOS app coming soon</p>
            <p className="mt-1 text-xs leading-5 text-white/75">
              We are preparing the native iOS experience. Stay tuned for the
              first release.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            aria-label="Close iOS coming soon message"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
