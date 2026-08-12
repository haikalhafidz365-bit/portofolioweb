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