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
    // min-h ngedorong konten bener-bener ke tengah TINGGI halaman (bukan cuma
    // nempel di atas dikasih padding kayak sebelumnya) — dipasang di wrapper
    // paling luar biar kerasa "centered" walau isinya lagi ketutup semua.
    // Kotak solid (bg-white/border/shadow) udah DILEPAS — dulu itu cuma buat
    // nutupin WatermarkBackground di belakangnya, tapi Watermark sekarang
    // sudah dibatasin cuma nongol di tab Home doang, jadi udah gak perlu lagi.
    <div className="w-full min-h-[65vh] flex flex-col items-center justify-center text-left py-10 px-4 sm:px-8 select-text">
      <div className="relative z-10 w-full max-w-2xl">
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
                className={`font-mono text-[0.75em] text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-90' : ''
                }`}
              >
                &gt;
              </span>
              <span className="font-mono text-[0.875em] sm:text-[1em] font-semibold uppercase tracking-[0.15em] text-gray-800 dark:text-gray-200">
                {label}
              </span>
            </button>

            {isOpen && (
              <div className="pb-6 pl-7 pr-2 text-[1em] sm:text-[1.125em] leading-relaxed sm:leading-loose text-gray-700 dark:text-gray-300 whitespace-pre-line">
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