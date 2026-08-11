import React, { useMemo } from 'react';

// Bikin angka "acak" yang KONSISTEN dari sebuah string — biar posisi tiap serpihan
// selalu sama tiap render (nggak lompat-lompat tiap kali state lain berubah).
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

    // Disusun grid 2 kolom: kolom kiri rata-kiri nempel tepi kiri, kolom kanan rata-kanan
    // nempel tepi kanan. Sengaja TIDAK masuk ke tengah — itu wilayah konten asli, biar
    // gak numpuk/ganggu bacaan. Baris disebar merata dari atas ke bawah halaman.
    const totalRows = Math.ceil(cleaned.length / 2);

    return cleaned.map((text, i) => {
      const column = i % 2; // 0 = kiri, 1 = kanan
      const row = Math.floor(i / 2);

      // Sebaran vertikal merata + sedikit jitter (biar gak kaku robotik), TANPA jitter
      // horizontal — itu yang bikin kolomnya beneran lurus rata kiri/kanan.
      const rowRatio = totalRows > 1 ? row / (totalRows - 1) : 0.5;
      const verticalJitter = (seededRandom(text, 'jit') - 0.5) * 4; // ±2%
      const top = Math.min(92, Math.max(4, 6 + rowRatio * 84 + verticalJitter));

      const size = 12 + seededRandom(text, 'size') * 6; // 12px - 18px, lebih seragam
      const opacity = 0.1 + seededRandom(text, 'op') * 0.06; // 0.10 - 0.16, dinaikin dikit dari sebelumnya

      return { text, top, column, size, opacity, key: `${text}-${i}` };
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
          className={`absolute font-serif italic text-gray-900 dark:text-white leading-snug ${
            it.column === 0 ? 'text-left' : 'text-right'
          }`}
          style={{
            top: `${it.top}%`,
            ...(it.column === 0 ? { left: '3%' } : { right: '3%' }),
            maxWidth: '38%',
            fontSize: `${it.size}px`,
            opacity: it.opacity,
          }}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}