import React, { useState, useEffect, useMemo } from 'react';

// ============ MIGRASI FORMAT LAMA -> BARU ============
// Data lama (sebelum kategori bisa custom lewat CMS) nyimpen career sebagai 3 key tetap:
// career.school / career.college / career.professional, masing-masing { bgImage, items }.
// Format baru: career.categories = array bebas, tiap kategori { id, name, type, bgImage, items }.
// Fungsi ini nyamain data lama ke bentuk baru secara transparan, biar data Supabase yang
// belum sempet disimpen ulang lewat CMS baru tetep kebaca normal di halaman publik.
// "School" SENGAJA didrop di sini (dianggap gak relevan lagi).
const LEGACY_KEYS = [
  { key: 'professional', name: 'Professional' },
  { key: 'college', name: 'College' },
];

function normalizeCareerData(raw) {
  const careerData = raw || {};

  if (Array.isArray(careerData.categories)) {
    return careerData.categories.map((cat, i) => ({
      id: cat.id || `cat-${i}`,
      name: cat.name || '',
      type: cat.type === 'credential' ? 'credential' : 'career',
      bgImage: cat.bgImage || '',
      items: Array.isArray(cat.items) ? cat.items : [],
    }));
  }

  // Format lama — konversi, School didrop.
  return LEGACY_KEYS.map(({ key, name }) => {
    const legacy = careerData[key];
    return {
      id: key,
      name,
      type: 'career',
      bgImage: (legacy && legacy.bgImage) || '',
      items: (legacy && Array.isArray(legacy.items)) ? legacy.items : [],
    };
  });
}

export default function Career({ data }) {
  // null = lagi di layar menu utama (pilih kategori)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  // Nyimpen companyInfo (tipe 'career') yang lagi diklik buat pop-up detail instansi
  const [selectedPopup, setSelectedPopup] = useState(null);
  // Nyimpen URL gambar (tipe 'credential') yang lagi diklik buat lightbox pratinjau bukti
  const [selectedImage, setSelectedImage] = useState(null);

  const careerData = data || {};
  const categories = useMemo(() => normalizeCareerData(careerData), [careerData]);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;

  // Esc buat nutup pop-up/lightbox yang lagi kebuka
  useEffect(() => {
    if (!selectedPopup && !selectedImage) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSelectedPopup(null);
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedPopup, selectedImage]);

  return (
    <div className="w-full text-gray-900 dark:text-gray-100 select-text py-4">

      {/* ======================= LAYAR 1: MENU KATEGORI (GAME-MENU STYLE) ======================= */}
      {!selectedCategory && (
        <div className="w-full">
          <h1 className="text-[1.875em] font-bold tracking-tight mb-1 text-gray-900 dark:text-white">
            {careerData.heading || 'Career & Education'}
          </h1>
          <p className="text-[0.875em] text-gray-500 dark:text-gray-400 mb-8">
            {careerData.subheading || 'Pilih salah satu buat lihat perjalanannya.'}
          </p>

          {categories.length === 0 ? (
            <p className="text-[0.875em] text-gray-400 italic">Belum ada kategori di sini.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((category, i) => {
                const bgImage = category.bgImage;
                const itemCount = category.items.length;

                return (
                  <button
                    key={category.id}
                    type="button"
                    data-hint-id={`career-category-${category.id}`}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`group relative h-64 sm:h-80 rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616] ${
                      bgImage
                        ? 'border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:border-[#2B579A] dark:hover:border-[#6FA8DC]'
                        : 'bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-[#2B579A] dark:hover:border-[#6FA8DC]'
                    }`}
                  >
                    {/* Background: cuma dipasang kalau ada foto dari CMS. Kalau kosong, kartu tetap putih polos. */}
                    {bgImage && (
                      <>
                        <img
                          src={bgImage}
                          alt={category.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* Overlay gelap cuma dipakai pas ada foto, biar teks putih di atasnya kebaca */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 group-hover:from-black/95 transition-colors" />
                      </>
                    )}

                    {/* Nomor urut, kesan "level" menu */}
                    <span className={`absolute top-4 left-4 font-mono text-[0.6875em] tracking-widest ${bgImage ? 'text-white/60' : 'text-[#2B579A]/60 dark:text-[#6FA8DC]/70'}`}>
                      0{i + 1}
                    </span>

                    {/* Konten Menu */}
                    <div className="relative h-full flex flex-col items-center justify-center gap-3 px-4">
                      <span className={`font-mono text-[1.125em] sm:text-[1.25em] font-bold uppercase tracking-[0.25em] text-center ${bgImage ? 'text-white drop-shadow-lg' : 'text-[#2B579A] dark:text-[#6FA8DC]'}`}>
                        {category.name || 'Tanpa Nama'}
                      </span>
                      <span className={`text-[0.6875em] font-mono tracking-wide ${bgImage ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                        {itemCount} entri
                      </span>
                      <span className={`mt-2 text-[0.625em] font-mono transition-colors duration-300 tracking-wider ${
                        bgImage
                          ? 'text-white/0 group-hover:text-white/80'
                          : 'text-[#2B579A]/0 dark:text-[#6FA8DC]/0 group-hover:text-[#2B579A] dark:group-hover:text-[#6FA8DC]'
                      }`}>
                        ▶ PILIH
                      </span>
                    </div>

                    {/* Aksen garis bawah pas hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#2B579A] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= LAYAR 2: DAFTAR ENTRI PER KATEGORI ======================= */}
      {selectedCategory && (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className="flex items-center gap-1.5 text-[0.75em] font-mono text-gray-500 dark:text-gray-400 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] mb-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616] rounded"
          >
            <span>←</span> Kembali ke Menu
          </button>

          <h1 className="text-[1.5em] font-bold tracking-tight mb-6 text-gray-900 dark:text-white">
            {selectedCategory.name || 'Tanpa Nama'}
          </h1>

          {selectedCategory.items.length === 0 && (
            <p className="text-[0.875em] text-gray-400 italic">Belum ada item di sini.</p>
          )}

          {/* -------- TIPE 'career': Posisi @ Instansi, periode, pop-up detail instansi -------- */}
          {selectedCategory.type === 'career' && (
            <div>
              {selectedCategory.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`flex flex-col sm:flex-row gap-1 sm:gap-6 py-5 ${idx !== 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}
                >
                  {/* Kolom kiri: periode waktu */}
                  <div className="sm:w-32 shrink-0 font-mono text-[0.75em] text-gray-400 dark:text-gray-500">
                    {item.period}
                  </div>

                  {/* Kolom kanan: posisi, instansi (klik = pop-up), deskripsi */}
                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-[1em] font-bold text-gray-900 dark:text-white">
                      {item.role}
                    </h3>

                    <button
                      type="button"
                      onClick={() => setSelectedPopup(item.companyInfo)}
                      {...(item.hintEnabled !== false ? { 'data-hint-id': `career-company-${item.id || idx}` } : {})}
                      className="font-mono text-[0.875em] text-gray-700 dark:text-gray-300 underline decoration-gray-400 dark:decoration-gray-600 underline-offset-2 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] hover:decoration-[#2B579A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616] rounded"
                      title="Klik untuk melihat detail"
                    >
                      {item.company}
                    </button>

                    <p className="text-[0.875em] text-gray-600 dark:text-gray-400 leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* -------- TIPE 'credential': nama pencapaian/sertifikat, penyelenggara, tanggal, bukti -------- */}
          {selectedCategory.type === 'credential' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {selectedCategory.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e]"
                >
                  {/* Thumbnail bukti — klik buat lightbox gede */}
                  {item.image ? (
                    <button
                      type="button"
                      onClick={() => setSelectedImage(item.image)}
                      title="Klik untuk lihat gambar penuh"
                      className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC]"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg bg-gray-100 dark:bg-[#2d2d2d] flex items-center justify-center text-gray-300 dark:text-gray-600 text-[0.625em] font-mono text-center px-1">
                      No Image
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3
                      className="text-[0.9375em] font-bold text-gray-900 dark:text-white leading-snug"
                      {...(item.hintEnabled !== false ? { 'data-hint-id': `career-credential-${item.id || idx}` } : {})}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[0.75em] font-mono text-gray-500 dark:text-gray-400">
                      {[item.issuer, item.date].filter(Boolean).join(' · ')}
                    </p>
                    {item.description && (
                      <p className="text-[0.8125em] text-gray-600 dark:text-gray-400 leading-relaxed pt-0.5">
                        {item.description}
                      </p>
                    )}
                    {item.verifyUrl && (
                      <a
                        href={item.verifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[0.75em] font-medium text-[#2B579A] dark:text-[#6FA8DC] underline underline-offset-2 hover:opacity-80 pt-1"
                      >
                        Lihat Bukti / Verifikasi ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================= MODAL / POP-UP DETAIL INSTANSI (TIPE 'career') ======================= */}
      {selectedPopup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPopup(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden relative flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => setSelectedPopup(null)}
              aria-label="Tutup"
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/85 dark:bg-black/50 backdrop-blur-sm text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white font-mono text-[1.125em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC]"
            >
              ✕
            </button>

            {/* Kolom kiri: foto, gede & ngisi penuh tinggi kartu — nggak ikut discroll */}
            {selectedPopup.photo && (
              <div className="w-full h-52 sm:h-64 md:h-auto md:w-72 lg:w-80 shrink-0 bg-gray-100 dark:bg-black/40">
                <img
                  src={selectedPopup.photo}
                  alt={selectedPopup.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Kolom kanan: info instansi, discroll sendiri kalau kepanjangan */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8">
              <h3 className="text-[1.125em] sm:text-[1.25em] font-bold text-gray-900 dark:text-white mb-1.5 pr-8">
                {selectedPopup.name}
              </h3>

              {selectedPopup.address && (
                <p className="text-[0.75em] text-gray-500 dark:text-gray-400 mb-4">
                  {selectedPopup.address}
                </p>
              )}

              <p className="text-[0.875em] text-gray-700 dark:text-gray-300 leading-relaxed">
                {selectedPopup.about}
              </p>

              <button
                onClick={() => setSelectedPopup(null)}
                className="mt-6 w-full py-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] text-gray-800 dark:text-gray-200 text-[0.75em] font-semibold rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#2d2d2d]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= LIGHTBOX GAMBAR BUKTI (TIPE 'credential') ======================= */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            aria-label="Tutup"
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-[1.125em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Pratinjau bukti"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}

    </div>
  );
}