// src/components/PelicanLoader.jsx
//
// Splash / loading screen: siluet pelikan putih badan utuh yang ngepakin sayap,
// di atas latar biru, dipasang gantiin layar "Memuat data portofolio..." polos
// yang lama. Dipakai di App.jsx pas isLoading masih true (nunggu data Supabase).
//
// Dua elemen animasinya independen:
//  1. Sayap pelikan — flap naik-turun terus-menerus (CSS keyframes, murni CSS
//     jadi ringan, ga butuh library animasi tambahan).
//  2. Teks di bawah — efek "diketik" (typing effect), ngetik SEKALI (gak loop
//     ngapus-ngetik-ulang lagi kayak sebelumnya), lalu diem/hold beberapa detik
//     abis full keketik, BARU manggil `onFinished` — App.jsx nunggu callback
//     ini (digabung sama status fetch data) sebelum masuk ke web-nya, jadi
//     pesannya kejamin kebaca dulu, gak keburu ke-skip.

import React, { useState, useEffect } from 'react';

// Hook kecil buat efek ketik SEKALI JALAN: ngetik teks huruf demi huruf, lalu
// begitu full, nunggu `holdAfterMs` (jeda baca) sebelum manggil `onDone`.
// Semua timeout-nya dicatat & di-clear pas unmount, biar gak ada callback
// nyangkut yang manggil state udah gak ada komponennya lagi.
function useTypeOnce(text, { typeSpeed = 85, holdAfterMs = 2500, onDone } = {}) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timeoutIds = [];
    let i = 0;

    const typeNextChar = () => {
      const id = setTimeout(() => {
        if (cancelled) return;
        i += 1;
        setDisplay(text.slice(0, i));

        if (i >= text.length) {
          // Kalimatnya udah full keketik — tunggu holdAfterMs dulu (biar sempet
          // kebaca), baru kasih tau parent-nya kalau splash-nya udah "selesai".
          const holdId = setTimeout(() => {
            if (!cancelled) onDone?.();
          }, holdAfterMs);
          timeoutIds.push(holdId);
          return;
        }

        typeNextChar();
      }, typeSpeed);
      timeoutIds.push(id);
    };

    typeNextChar();

    return () => {
      cancelled = true;
      timeoutIds.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, typeSpeed, holdAfterMs]);

  return display;
}

export default function PelicanLoader({
  text = 'Use laptop or tablet for a full experience',
  // Jeda (ms) SETELAH kalimat full keketik, sebelum `onFinished` dipanggil.
  // Ini yang bikin ada waktu "diem sebentar" buat baca pesannya sebelum App.jsx
  // ngelanjutin masuk ke web.
  holdAfterMs = 2500,
  // Dipanggil App.jsx pas splash ini dianggap "selesai tampil" (ketikan penuh +
  // holdAfterMs kelewat). App.jsx nunggu ini DIGABUNG sama status fetch data
  // sebelum bener-bener nyembunyiin layar loading.
  onFinished,
}) {
  const typedText = useTypeOnce(text, { holdAfterMs, onDone: onFinished });

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#2b579a] px-4">

      {/* Siluet pelikan — bentuknya SAMA kayak icon di WelcomeToast (biar konsisten satu portofolio),
          cuma di sini di-gedein & grup sayapnya (.pelican-wing) di-animasi ngepak terus-menerus */}
      <svg
        viewBox="25 50 180 130"
        className="w-40 h-auto sm:w-52"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <style>{`
          @keyframes pelicanFlap {
            0%   { transform: rotate(6deg); }
            50%  { transform: rotate(-30deg); }
            100% { transform: rotate(6deg); }
          }
          .pelican-wing {
            transform-origin: 125px 121px;
            animation: pelicanFlap 1.1s ease-in-out infinite;
          }
        `}</style>

        {/* Ekor */}
        <path d="M116 150 Q108 152 96 149 Q106 145 114 144 Z" />

        {/* Sayap bawah/depan (statis) */}
        <path d="M104 140 Q60 138 40 148 Q54 132 70 128 Q86 126 106 136 Z" />

        {/* Badan */}
        <ellipse cx="132" cy="140" rx="34" ry="13" transform="rotate(-8 132 140)" />

        {/* Kepala + paruh */}
        <path d="M110 132 Q100 128 92 129 Q98 132 104 136 Q107 138 111 137 Z" />

        {/* Mata (lubang kecil biar siluetnya ga blok polos) */}
        <circle cx="105" cy="131" r="2.2" fill="#2b579a" stroke="none" />

        {/* Kaki */}
        <path
          d="M176 150 L182 166 M188 148 L196 163"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Sayap atas — ini yang di-animasi ngepak */}
        <g className="pelican-wing">
          <path d="M128 122 Q134 84 168 68 Q160 96 148 116 Q140 124 128 122 Z" />
          <path d="M122 118 Q126 76 158 58 Q152 88 140 110 Q132 118 122 118 Z" />
        </g>
      </svg>

      {/* Teks efek ketik + kursor berkedip */}
      <p className="mt-6 text-sm sm:text-base font-mono text-white/90 tracking-wide h-5">
        {typedText}
        <span className="inline-block w-[2px] h-[1em] align-middle bg-white/80 ml-0.5 animate-pulse" />
      </p>
    </div>
  );
}