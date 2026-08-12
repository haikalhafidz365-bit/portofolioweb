import React, { useState } from 'react';

const SECTIONS = [
  { key: 'live', label: 'Live' },
  { key: 'life', label: 'Life' },
  { key: 'laugh', label: 'Laugh' },
];

export default function About({ data }) {
  // Default-nya semua section ketutup, cuma judulnya doang yang nampak (kayak referensi lo).
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (key) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const content = data || {};

  return (
    <div className="w-full flex flex-col items-center justify-center text-left py-16 px-4 sm:px-8 select-text">
      {/* Dikotakin dalam 1 card solid — biar teks watermark di belakang (WatermarkBackground)
          gak numpuk/nembus ke area baca. Card ini punya background sendiri (opaque),
          jadi apapun yang ada di belakangnya otomatis ketutup rapi. */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm px-5 sm:px-8">
        {SECTIONS.map(({ key, label }, idx) => {
        const isOpen = openSection === key;
        const text = content[key];

        return (
          <div
            key={key}
            className={`w-full ${idx !== 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}
          >
            <button
              type="button"
              data-hint-id={`about-toggle-${key}`}
              onClick={() => toggleSection(key)}
              className="w-full flex items-center gap-3 py-4 text-left"
            >
              <span
                className={`font-mono text-xs text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-90' : ''
                }`}
              >
                &gt;
              </span>
              <span className="font-mono text-sm sm:text-base font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-gray-200">
                {label}
              </span>
            </button>

            {isOpen && (
              <div className="pb-6 pl-7 pr-2 text-base sm:text-lg leading-relaxed sm:leading-loose text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {Array.isArray(text) ? (
                  text.length > 0 ? (
                    <ul className="space-y-2.5 list-disc list-outside pl-5 marker:text-gray-400 dark:marker:text-gray-600">
                      {text.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    'Belum ada cerita di sini.'
                  )
                ) : (
                  text || 'Belum ada cerita di sini.'
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}