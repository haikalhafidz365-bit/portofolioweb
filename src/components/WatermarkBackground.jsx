import React, { useMemo } from 'react';

// Bikin angka "acak" yang KONSISTEN dari sebuah string — biar posisi tiap serpihan
// selalu sama tiap render (nggak lompat-lompat tiap kali state lain berubah), tapi
// tetep keliatan berantakan/nggak beraturan dari satu serpihan ke serpihan lain.
function seededRandom(str, salt) {
  let hash = 0;
  const full = str + salt;
  for (let i = 0; i < full.length; i++) {
    hash = (hash << 5) - hash + full.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000; // 0..1
}

export default function WatermarkBackground({ odds }) {
  const items = useMemo(() => {
    const cleaned = (odds || []).map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return [];

    return cleaned.map((text, i) => {
      const top = 4 + seededRandom(text, 'top') * 90; // 4% - 94% dari tinggi halaman
      const left = 2 + seededRandom(text, 'left') * 82; // 2% - 84% dari lebar halaman
      const rotate = (seededRandom(text, 'rot') - 0.5) * 32; // -16deg .. 16deg
      const size = 11 + seededRandom(text, 'size') * 10; // 11px - 21px
      const opacity = 0.05 + seededRandom(text, 'op') * 0.06; // 0.05 - 0.11
      const maxWidth = 120 + seededRandom(text, 'w') * 100; // biar teks panjang ke-wrap, bukan numpuk 1 baris

      return { text, top, left, rotate, size, opacity, maxWidth, key: `${text}-${i}` };
    });
  }, [odds]);

  if (items.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {items.map((it) => (
        <span
          key={it.key}
          className="absolute font-serif italic text-gray-900 dark:text-white leading-snug"
          style={{
            top: `${it.top}%`,
            left: `${it.left}%`,
            maxWidth: `${it.maxWidth}px`,
            fontSize: `${it.size}px`,
            opacity: it.opacity,
            transform: `rotate(${it.rotate}deg)`,
          }}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}