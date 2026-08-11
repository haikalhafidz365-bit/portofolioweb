import React, { useState, useEffect, useCallback } from 'react';

// Posisi visual tiap "lapisan" tumpukan, dari paling depan (index 0) ke paling belakang.
// Sengaja dibikin ACAK/berantakan (offset & sudut miring yang gak simetris ke segala arah)
// biar kesannya kayak numpuk buku fisik ditaro asal di meja, bukan susunan kipas yang rapi.
const STACK_LAYERS = [
  { x: 4, y: -16, rotate: -4 },  // depan — paling atas, paling gede, & sedikit "terangkat"
  { x: 58, y: 10, rotate: 9 },   // nyembul ke kanan
  { x: -20, y: 22, rotate: -8 }, // agak ke kiri, sedikit turun
  { x: -52, y: 40, rotate: -13 },// paling kiri, paling bawah/belakang
  { x: 28, y: 34, rotate: 6 },
];

export default function Book({ data }) {
  const bookData = data || {};
  const heading = bookData.heading || 'Books, Writings & Open Source';
  const subheading = bookData.subheading || 'Etalase publikasi, esai, dan proyek open-source buatan saya.';
  const items = bookData.items || [];

  // Urutan tumpukan SEKARANG — order[0] = buku paling depan/atas.
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  useEffect(() => {
    setOrder(items.map((_, i) => i));
  }, [items.length]);

  // 'shelf' = lagi liat tumpukan + sinopsis singkat, 'detail' = buku kebuka + detail lengkap
  const [viewMode, setViewMode] = useState('shelf');
  const [isMobile, setIsMobile] = useState(false);

  const activeIndex = order[0] ?? 0;
  const activeBook = items[activeIndex];

  // Bawa satu buku ke posisi PALING DEPAN tumpukan (sisanya tetep urut relatifnya)
  const bringToFront = useCallback((idx) => {
    setOrder((prev) => (prev[0] === idx ? prev : [idx, ...prev.filter((i) => i !== idx)]));
  }, []);

  // "Next" = buku paling depan geser ke PALING BELAKANG, yang di baliknya naik ke depan
  const goNext = useCallback(() => {
    setOrder((prev) => (prev.length < 2 ? prev : [...prev.slice(1), prev[0]]));
  }, []);
  // "Prev" = kebalikannya — buku paling belakang ditarik balik ke depan
  const goPrev = useCallback(() => {
    setOrder((prev) => (prev.length < 2 ? prev : [prev[prev.length - 1], ...prev.slice(0, -1)]));
  }, []);

  const openDetail = () => setViewMode('detail');
  const backToShelf = () => setViewMode('shelf');

  // Deteksi lebar layar buat ukuran kartu tumpukan
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Navigasi keyboard: panah gonta-ganti tumpukan, Esc balik ke rak kalau lagi baca detail
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') { goPrev(); return; }
      if (e.key === 'ArrowRight') { goNext(); return; }
      if (e.key === 'Escape' && viewMode === 'detail') backToShelf();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, goPrev, goNext]);

  if (items.length === 0) {
    return (
      <div className="w-full text-gray-900 dark:text-gray-100 py-10 text-center">
        <h1 className="text-2xl font-bold mb-2">{heading}</h1>
        <p className="text-sm text-gray-400 italic">Belum ada karya yang ditambahkan.</p>
      </div>
    );
  }

  // Satu jenis kartu dipakai buat SEMUA posisi di tumpukan (depan maupun belakang) — biar
  // pas urutan berubah, React cuma update posisi/ukurannya, bukan bongkar-pasang elemen dari
  // nol. Nggak ada drag/rotate manual/touchAction di sini, jadi scroll normal gak kesita.
  // Klik buku PALING DEPAN -> langsung buka halaman detail. Klik buku LAINNYA -> ditarik ke depan dulu.
  const StackCard = ({ item, idx, pos }) => {
    const isActive = pos === 0;
    const layer = STACK_LAYERS[pos] || STACK_LAYERS[STACK_LAYERS.length - 1];
    const width = isMobile ? (isActive ? 158 : 134) : (isActive ? 216 : 178);
    const height = isMobile ? (isActive ? 212 : 178) : (isActive ? 288 : 238);
    const offsetScale = isMobile ? 0.55 : 1;

    return (
      <button
        type="button"
        onClick={() => (isActive ? openDetail() : bringToFront(idx))}
        aria-label={isActive ? `Buka ${item.title}` : `Pilih ${item.title}`}
        aria-current={isActive ? 'true' : undefined}
        className="absolute rounded-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC]"
        style={{
          width,
          height,
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${layer.x * offsetScale}px), calc(-50% + ${layer.y * offsetScale}px)) rotate(${layer.rotate}deg)`,
          zIndex: 100 - pos,
          willChange: 'transform',
          // Buku yang jadi depan: gerakannya kayak ditarik-terus-ditaro — dikasih sedikit
          // "overshoot" (cubic-bezier melewati 1 lalu balik) biar berasa ada momen keangkat
          // dan mendarat, bukan geser lurus kaku. Buku lainnya nyusul belakangan (delay
          // estafet sesuai jarak posisinya) biar kesannya ikut kedorong, bukan lompat bareng.
          transitionProperty: 'transform, width, height',
          transitionDuration: isActive ? '700ms, 700ms, 700ms' : '560ms, 560ms, 560ms',
          transitionTimingFunction: isActive
            ? 'cubic-bezier(0.3, 1.4, 0.4, 1)'
            : 'cubic-bezier(0.22, 1, 0.36, 1)',
          transitionDelay: isActive ? '0ms' : `${Math.min(pos * 45, 140)}ms`,
        }}
      >
        <div
          className={`relative w-full h-full rounded-sm overflow-hidden border shadow-xl ${
            isActive
              ? 'border-[#2B579A] dark:border-[#6FA8DC] ring-2 ring-[#2B579A]/30 dark:ring-[#6FA8DC]/30'
              : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" draggable={false} />
        </div>
        {/* Spine — sisi kanan, gelap */}
        <div className="absolute top-1 bottom-1 -right-[5px] w-[5px] rounded-r-sm bg-black/30 dark:bg-black/50 pointer-events-none" />
        {/* Pinggiran halaman — sisi atas, terang */}
        <div className="absolute -top-[5px] left-1 right-1 h-[5px] rounded-t-sm bg-[#f0e6d2] pointer-events-none" />
      </button>
    );
  };

  return (
    <div className="w-full text-gray-900 dark:text-gray-100 select-text py-4">

      {/* ======================= MODE RAK (tumpukan berantakan + sinopsis singkat di samping) ======================= */}
      {viewMode === 'shelf' && (
        <div className="view-reveal">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {heading}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8 max-w-lg">
            {subheading}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr] gap-8 lg:gap-12 items-center">

            {/* KIRI: tumpukan buku berantakan — buat milih & buka buku */}
            <div>
              <div className="relative h-64 sm:h-72">
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-44 sm:w-56 h-6 bg-black/10 dark:bg-black/40 blur-xl rounded-full pointer-events-none" />

                <button
                  type="button"
                  onClick={goPrev}
                  disabled={items.length < 2}
                  aria-label="Geser tumpukan ke kiri"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-30 font-mono text-lg w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC]"
                >
                  ←
                </button>

                {/* Render belakang -> depan, biar yang paling depan digambar paling akhir (di atas) */}
                {order
                  .map((idx, pos) => ({ item: items[idx], idx, pos }))
                  .filter(({ pos }) => pos < STACK_LAYERS.length)
                  .slice()
                  .reverse()
                  .map(({ item, idx, pos }) => (
                    <StackCard key={item.id ?? idx} item={item} idx={idx} pos={pos} />
                  ))}

                <button
                  type="button"
                  onClick={goNext}
                  disabled={items.length < 2}
                  aria-label="Geser tumpukan ke kanan"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-30 font-mono text-lg w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC]"
                >
                  →
                </button>
              </div>

              <p className="text-center font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                ← → geser tumpukan · klik buku paling depan buat baca
              </p>
            </div>

            {/* KANAN: judul + sinopsis singkat buku paling depan (teks doang, gak ada interaksi buka di sini) */}
            <div>
              <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 tracking-widest">
                PALING DEPAN · {String(activeIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {activeBook.title}
              </h2>
              <span className="inline-block font-mono text-[10px] uppercase tracking-widest border border-dashed border-[#2B579A]/50 dark:border-[#6FA8DC]/50 text-[#2B579A] dark:text-[#6FA8DC] px-2 py-1 rounded -rotate-2 mt-2">
                {activeBook.category}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3 max-w-md">
                {activeBook.summary}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ======================= MODE DETAIL — buku "kebuka": foto isi di satu sisi, detail lengkap di sisi lain ======================= */}
      {viewMode === 'detail' && activeBook && (
        <div className="view-reveal">
          <button
            type="button"
            onClick={backToShelf}
            className="font-mono text-xs text-gray-500 dark:text-gray-400 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] transition-colors mb-6 inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] rounded"
          >
            ← Kembali ke Tumpukan
          </button>

          {/* "Buku kebuka" — dua sisi kayak spread buku beneran, dipisah garis lipatan/spine di tengah */}
          <div className="relative rounded-md overflow-hidden border border-gray-300 dark:border-gray-700 shadow-2xl bg-[#f6f2e9] dark:bg-[#242018] grid grid-cols-1 sm:grid-cols-2">

            {/* SISI KIRI — foto isi buku (overview) */}
            <div className="relative h-56 sm:h-auto sm:min-h-[420px] bg-gray-100 dark:bg-black/30 overflow-hidden">
              {activeBook.overviewImage ? (
                <img src={activeBook.overviewImage} alt={`Isi buku ${activeBook.title}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center px-6 font-mono text-xs text-gray-400 dark:text-gray-600">
                  belum ada foto overview buat buku ini
                </div>
              )}
              {/* Bayangan lipatan buku, cuma keliatan di layar lebar (sisi kiri & kanan sebelahan) */}
              <div className="hidden sm:block absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-black/15 to-transparent pointer-events-none" />
            </div>

            {/* SISI KANAN — detail lengkap */}
            <div className="relative p-6 sm:p-8 md:p-10 flex flex-col justify-between">
              <div className="hidden sm:block absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />

              <div>
                <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 tracking-widest">
                  DOKUMEN {String(activeIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1.5 leading-snug">
                  {activeBook.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-block font-mono text-[10px] uppercase tracking-widest border border-dashed border-[#2B579A]/50 dark:border-[#6FA8DC]/50 text-[#2B579A] dark:text-[#6FA8DC] px-2 py-1 rounded -rotate-2">
                    {activeBook.category}
                  </span>
                  {activeBook.pageCount && (
                    <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                      {activeBook.pageCount} halaman
                    </span>
                  )}
                </div>

                <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mt-5 space-y-4">
                  <p>{activeBook.fullDescription}</p>
                </div>
              </div>

              {activeBook.actionUrl && (
                <a
                  href={activeBook.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-6 w-fit font-mono text-xs bg-[#2B579A] hover:bg-[#1e3f73] dark:bg-[#6FA8DC] dark:hover:bg-[#5a95c9] text-white dark:text-[#1a1a1a] px-4 py-2 rounded-sm transition-colors"
                >
                  {activeBook.actionText || 'Lihat Selengkapnya'} ↗
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] text-gray-400 dark:text-gray-500">
            <span>esc untuk kembali ke tumpukan</span>
            {items.length > 1 && (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:text-[#2B579A] dark:hover:text-[#6FA8DC] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] rounded"
                >
                  ← Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="hover:text-[#2B579A] dark:hover:text-[#6FA8DC] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] rounded"
                >
                  Berikutnya →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes viewReveal {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .view-reveal {
          animation: viewReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .view-reveal { animation: none; }
        }
      `}</style>
    </div>
  );
}