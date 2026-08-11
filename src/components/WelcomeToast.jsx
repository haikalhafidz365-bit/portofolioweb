import React, { useState, useEffect } from 'react';

// Kunci sessionStorage biar notif cuma muncul SEKALI per sesi tab browser (bukan tiap
// pindah-pindah tab Home/About/dst, dan bukan tiap refresh — tapi tetep muncul lagi
// kalau tab/browser-nya beneran ditutup terus dibuka baru).
const SEEN_KEY = 'portfolio_welcome_seen';

export default function WelcomeToast({ settings, isMobileLayout }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const enabled = settings?.enabled;
  const title = settings?.title || 'Selamat datang! 👋';
  const message = settings?.message || '';
  const delaySeconds = Number.isFinite(settings?.delaySeconds) ? settings.delaySeconds : 2;

  useEffect(() => {
    if (!enabled) return;

    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SEEN_KEY) === 'true';
    } catch {
      /* sessionStorage gak tersedia — anggap belum pernah lihat, gapapa muncul lagi */
    }
    if (alreadySeen) return;

    const timer = setTimeout(() => {
      setVisible(true);
      try {
        sessionStorage.setItem(SEEN_KEY, 'true');
      } catch {
        /* diamkan kalau gagal nulis, gak fatal */
      }
    }, Math.max(0, delaySeconds) * 1000);

    return () => clearTimeout(timer);
  }, [enabled, delaySeconds]);

  const handleClose = () => {
    setClosing(true);
    // Kasih waktu buat animasi keluar main dulu sebelum bener-bener di-unmount
    setTimeout(() => setVisible(false), 200);
  };

  if (!enabled || !visible) return null;

  return (
    <div
      className={
        isMobileLayout
          ? `fixed left-3 right-3 bottom-3 z-[90] transition-all duration-200 ${
              closing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`
          : `fixed right-4 bottom-4 z-[90] w-full max-w-xs transition-all duration-200 ${
              closing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`
      }
      role="status"
    >
      <div className="bg-white dark:bg-[#242424] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 flex gap-3 items-start">
        <span className="text-xl leading-none shrink-0 mt-0.5">👋</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
            {title}
          </h4>
          {message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup notifikasi"
          className="shrink-0 -mt-1 -mr-1 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}