// src/components/PelicanLoader.jsx
//
// Splash / loading screen: siluet pelikan putih badan utuh yang ngepakin sayap,
// di atas latar biru, dipasang gantiin layar "Memuat data portofolio..." polos
// yang lama. Dipakai di App.jsx pas isLoading masih true (nunggu data Supabase).
//
// Dua elemen animasinya independen:
//  1. Sayap pelikan — flap naik-turun terus-menerus (CSS keyframes, murni CSS
//     jadi ringan, ga butuh library animasi tambahan).
//  2. Teks di bawah — efek "diketik" (typing effect), ngetik lalu ngapus lalu
//     ngetik lagi secara loop, biar kerasa hidup walau loading-nya kebetulan
//     sebentar aja.

import React, { useState, useEffect } from 'react';

// Hook kecil buat efek ketik: ngetik teks huruf demi huruf, jeda sebentar pas
// full, lalu ngapus huruf demi huruf, jeda sebentar pas kosong, lalu ulang.
function useTypingLoop(text, { typeSpeed = 85, deleteSpeed = 45, holdFull = 1100, holdEmpty = 400 } = {}) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    let i = 0;
    let deleting = false;
    let timeoutId;

    const tick = () => {
      if (!deleting) {
        i += 1;
        setDisplay(text.slice(0, i));
        if (i >= text.length) {
          timeoutId = setTimeout(() => { deleting = true; tick(); }, holdFull);
          return;
        }
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        i -= 1;
        setDisplay(text.slice(0, i));
        if (i <= 0) {
          timeoutId = setTimeout(() => { deleting = false; tick(); }, holdEmpty);
          return;
        }
        timeoutId = setTimeout(tick, deleteSpeed);
      }
    };

    timeoutId = setTimeout(tick, typeSpeed);
    return () => clearTimeout(timeoutId);
  }, [text, typeSpeed, deleteSpeed, holdFull, holdEmpty]);

  return display;
}

export default function PelicanLoader({ text = 'Memuat portofolio...' }) {
  const typedText = useTypingLoop(text);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#2b579a] px-4">

      {/* Siluet pelikan — badan & kepala statis, cuma grup <g className="wing"> yang di-animasi */}
      <svg
        viewBox="0 0 300 200"
        className="w-40 h-auto sm:w-52"
        fill="#ffffff"
        aria-hidden="true"
      >
        <style>{`
          @keyframes pelicanFlap {
            0%   { transform: rotate(6deg); }
            50%  { transform: rotate(-30deg); }
            100% { transform: rotate(6deg); }
          }
          .pelican-wing {
            transform-origin: 150px 92px;
            animation: pelicanFlap 1.1s ease-in-out infinite;
          }
        `}</style>

        {/* Badan + ekor */}
        <path d="M120 150
                 C 90 150, 70 130, 72 108
                 C 74 88, 95 76, 120 78
                 C 118 60, 128 46, 148 44
                 C 150 44, 152 44, 154 45
                 C 158 30, 175 26, 190 34
                 C 200 39, 203 48, 199 56
                 C 214 58, 224 68, 222 80
                 C 220 92, 205 96, 195 92
                 C 198 108, 190 124, 172 132
                 C 178 140, 176 150, 166 154
                 C 156 158, 146 152, 146 152
                 C 146 152, 132 150, 120 150 Z" />

        {/* Kepala + paruh + kantung pelikan */}
        <path d="M154 45
                 C 165 40, 178 40, 188 47
                 C 210 60, 250 66, 278 62
                 C 282 61.5, 285 64, 283 67
                 C 275 78, 258 84, 240 84
                 C 244 92, 240 100, 230 101
                 C 214 103, 200 96, 195 84
                 C 199 76, 199 66, 194 58
                 C 190 51, 180 46, 168 46
                 C 163 46, 158 45.5, 154 45 Z" />

        {/* Mata (lubang kecil biar siluetnya ga blok polos) */}
        <circle cx="211" cy="58" r="3.2" fill="#2b579a" />

        {/* Sayap — ini yang di-animasi ngepak */}
        <g className="pelican-wing">
          <path d="M150 92
                   C 130 86, 104 88, 82 102
                   C 62 114, 46 132, 40 152
                   C 39 155, 42 157, 45 155
                   C 66 142, 90 132, 112 128
                   C 130 125, 144 116, 150 100
                   Z" />
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