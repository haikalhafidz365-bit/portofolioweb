import React, { useState, useEffect } from 'react';

export default function Projects({ data, initialArticleId }) {
  const projectsData = data || {};
  const heading = projectsData.heading || 'Projects, Articles & Visuals';
  const subheading =
    projectsData.subheading ||
    'Kumpulan karya tulis artikel bergaya portal berita dan galeri visual pilihan.';
  const articles = projectsData.articles || [];
  const gallery = projectsData.gallery || {};
  const galleryPoster = gallery.poster || [];
  const galleryPhoto = gallery.photo || [];

  // Menu utama: 'articles' (tulisan) atau 'gallery' (poster & foto)
  const [activeCategory, setActiveCategory] = useState('articles');

  // Artikel yang lagi dibaca penuh (null = masih di daftar/mode Mojok)
  const [selectedArticle, setSelectedArticle] = useState(null);
  // Kontrol modal Share (nyimpen artikel yang lagi mau di-share, null = modal ketutup)
  const [shareArticle, setShareArticle] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Sub-menu di dalam Gallery: 'poster' atau 'photo'
  const [gallerySubTab, setGallerySubTab] = useState('poster');
  // Item gallery yang lagi dibuka detailnya (null = masih di tampilan grid)
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(null);
  // Kepadatan grid masonry: 'nyaman' (kartu gede, dikit kolom) atau 'padat'
  // (lebih banyak kolom, kartu lebih kecil). Default gede biar keliatan jelas.
  const [gridDensity, setGridDensity] = useState('nyaman');

  // Artikel pertama di data = artikel unggulan (gaya headline Mojok),
  // sisanya jadi daftar kecil di sampingnya
  const featured = articles[0];
  const restArticles = articles.slice(1);

  const activeGalleryItems = gallerySubTab === 'poster' ? galleryPoster : galleryPhoto;
  const selectedGalleryItem =
    selectedGalleryIndex !== null ? activeGalleryItems[selectedGalleryIndex] : null;

  // Deep-link: kalau app dibuka lewat link hasil Share (?tab=Projects&article=ID),
  // otomatis langsung buka artikel yang dimaksud begitu data artikel-nya kebaca.
  useEffect(() => {
    if (!initialArticleId || articles.length === 0) return;
    const match = articles.find((a) => a.id === initialArticleId);
    if (match) setSelectedArticle(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialArticleId, articles.length]);

  // Sinkronin URL browser tiap kali buka/tutup artikel — INI yang bikin link Share
  // beneran ngarah ke artikel yang tepat (bukan cuma mendarat di halaman awal).
  const openArticle = (art) => {
    setSelectedArticle(art);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'Projects');
    url.searchParams.set('article', art.id);
    window.history.pushState(null, '', url);
  };
  const closeArticle = () => {
    setSelectedArticle(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('article');
    window.history.pushState(null, '', url);
  };

  const buildShareUrl = (art) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('tab', 'Projects');
    url.searchParams.set('article', art.id);
    return url.toString();
  };

  const handleNativeShare = async (art) => {
    const shareUrl = buildShareUrl(art);
    if (navigator.share) {
      try {
        await navigator.share({ title: art.title, text: art.snippet, url: shareUrl });
        return;
      } catch (err) {
        // Kalau dibatalin (AbortError) ya udah, gak perlu munculin modal fallback
        if (err?.name === 'AbortError') return;
      }
    }
    setShareArticle(art);
    setLinkCopied(false);
  };

  const handleCopyLink = async (art) => {
    const shareUrl = buildShareUrl(art);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt('Salin link ini:', shareUrl);
    }
  };

  // Balik ke tampilan grid tiap kali pindah antara Poster <-> Photo
  useEffect(() => {
    setSelectedGalleryIndex(null);
  }, [gallerySubTab]);

  const nextGalleryItem = () =>
    setSelectedGalleryIndex((prev) => (prev + 1) % activeGalleryItems.length);
  const prevGalleryItem = () =>
    setSelectedGalleryIndex((prev) => (prev - 1 + activeGalleryItems.length) % activeGalleryItems.length);

  // Esc balik ke daftar artikel pas lagi baca satu artikel penuh
  useEffect(() => {
    if (!selectedArticle) return;
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedArticle(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedArticle]);

  // Navigasi keyboard pas lagi di mode detail gallery: Esc balik ke grid,
  // panah kiri/kanan gonta-ganti item
  useEffect(() => {
    if (selectedGalleryIndex === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedGalleryIndex(null);
      if (e.key === 'ArrowLeft' && activeGalleryItems.length > 1) prevGalleryItem();
      if (e.key === 'ArrowRight' && activeGalleryItems.length > 1) nextGalleryItem();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedGalleryIndex, activeGalleryItems.length]);

  return (
    <div className="w-full text-gray-900 dark:text-gray-100 select-text py-4">

      {/* Judul Halaman */}
      <h1 className="text-2xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
        {heading}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {subheading}
      </p>

      {/* Navigasi Menu Utama */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        {[
          { key: 'articles', label: 'Articles' },
          { key: 'gallery', label: 'Gallery' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveCategory(tab.key);
              setSelectedArticle(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616] ${
              activeCategory === tab.key
                ? 'bg-[#2B579A] dark:bg-[#6FA8DC] text-white dark:text-[#1a1a1a] shadow-sm'
                : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#383838]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================= MENU: ARTICLES (gaya portal berita / Mojok) ======================= */}
      {activeCategory === 'articles' && (
        <div>
          {!selectedArticle ? (
            articles.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-10 text-center">
                Belum ada artikel yang ditambahkan.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-10">

                {/* Artikel unggulan — tampil besar di kiri */}
                {featured && (
                  <div
                    onClick={() => openArticle(featured)}
                    className="cursor-pointer group"
                  >
                    {featured.category && (
                      <span className="inline-block bg-green-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wide px-3 py-1.5 mb-3">
                        {featured.category}
                      </span>
                    )}
                    {featured.image && (
                      <div className="w-full aspect-[16/10] overflow-hidden rounded-sm mb-4 bg-gray-100 dark:bg-black/40">
                        <img
                          src={featured.image}
                          alt={featured.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                    )}
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                      {featured.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-3 font-mono">
                      {featured.author && (
                        <>
                          <span>
                            OLEH{' '}
                            <span className="text-green-700 dark:text-green-400 font-semibold">
                              {featured.author.toUpperCase()}
                            </span>
                          </span>
                          <span>·</span>
                        </>
                      )}
                      <span>{featured.date}</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
                      {featured.snippet}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openArticle(featured);
                      }}
                      className="mt-5 inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-wide border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-sm hover:border-green-600 hover:text-green-700 dark:hover:text-green-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                    >
                      Baca Selengkapnya
                    </button>
                  </div>
                )}

                {/* Daftar artikel lainnya — kecil di kanan */}
                {restArticles.length > 0 && (
                  <div className="space-y-5 lg:border-l lg:pl-8 border-gray-100 dark:border-gray-800">
                    {restArticles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => openArticle(art)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openArticle(art);
                          }
                        }}
                        className="flex gap-3 cursor-pointer group items-start rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                      >
                        {art.image && (
                          <div className="w-20 h-16 sm:w-24 sm:h-20 shrink-0 overflow-hidden rounded-sm bg-gray-100 dark:bg-black/40">
                            <img
                              src={art.image}
                              alt={art.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-snug text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors line-clamp-3">
                            {art.title}
                          </h3>
                          <span className="text-[10px] font-mono text-gray-400 mt-1.5 inline-block">
                            {art.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            /* Tampilan Baca Artikel Penuh (Detail View) */
            <div className="space-y-6 view-reveal">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={closeArticle}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] bg-gray-100 dark:bg-[#2d2d2d] px-3 py-1.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                >
                  &larr; Kembali ke Daftar Artikel
                </button>

                <button
                  onClick={() => handleNativeShare(selectedArticle)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2B579A] dark:bg-[#6FA8DC] dark:text-[#1a1a1a] px-3.5 py-1.5 rounded shadow-sm hover:bg-[#1e3f73] dark:hover:bg-[#5a95c9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /></svg>
                  Share
                </button>
              </div>

              <div className="max-w-2xl space-y-4">
                {selectedArticle.category && (
                  <span className="inline-block bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5">
                    {selectedArticle.category}
                  </span>
                )}

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-snug">
                  {selectedArticle.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 font-mono">
                  {selectedArticle.author && (
                    <>
                      <span>
                        OLEH{' '}
                        <span className="text-green-700 dark:text-green-400 font-semibold">
                          {selectedArticle.author.toUpperCase()}
                        </span>
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span>{selectedArticle.date}</span>
                </div>

                {selectedArticle.image && (
                  <div className="w-full aspect-[16/9] overflow-hidden rounded-sm bg-gray-100 dark:bg-black/40">
                    <img
                      src={selectedArticle.image}
                      alt={selectedArticle.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed space-y-4 pt-1">
                  <p className="font-medium text-base text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-[#252526] p-4 rounded border-l-4 border-green-600">
                    {selectedArticle.snippet}
                  </p>
                  {/* Isi artikel disimpan sebagai HTML (dari editor Bold/Italic/Underline/List/Link
                      di CMS), jadi dirender pakai dangerouslySetInnerHTML biar formatnya kebawa —
                      bukan cuma teks polos kayak sebelumnya. Cuma admin (password-protected) yang
                      bisa nulis ke field ini lewat CMS, jadi aman dari XSS pihak luar. */}
                  <div
                    className="space-y-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-[#2B579A] dark:[&_a]:text-[#6FA8DC] [&_a]:underline [&_a]:font-medium"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= MENU: GALLERY (Poster & Photo, gaya grid e-commerce) ======================= */}
      {activeCategory === 'gallery' && (
        <div className="space-y-6">

          {/* Sub-menu Poster / Photo + toggle ukuran kartu */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {[
                { key: 'poster', label: 'Poster' },
                { key: 'photo', label: 'Photo' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setGallerySubTab(tab.key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616] ${
                    gallerySubTab === tab.key
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                      : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeGalleryItems.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                <span className="hidden sm:inline mr-1">Ukuran:</span>
                {[
                  { key: 'nyaman', label: 'Besar' },
                  { key: 'padat', label: 'Padat' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGridDensity(opt.key)}
                    className={`px-2.5 py-1 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616] ${
                      gridDensity === opt.key
                        ? 'bg-[#2B579A] dark:bg-[#6FA8DC] text-white dark:text-[#1a1a1a] border-[#2B579A] dark:border-[#6FA8DC]'
                        : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeGalleryItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-10 text-center">
              Belum ada {gallerySubTab === 'poster' ? 'poster' : 'foto'} yang ditambahkan.
            </p>
          ) : !selectedGalleryItem ? (
            /* Masonry ala Pinterest — tinggi kartu ngikutin rasio gambar asli,
               bukan dipaksa seragam, jadi susunannya berantakan alami */
            <div
              className={`gap-4 sm:gap-5 ${
                gridDensity === 'nyaman'
                  ? 'columns-1 sm:columns-2 lg:columns-2 xl:columns-3'
                  : 'columns-2 sm:columns-3 lg:columns-4'
              }`}
            >
              {activeGalleryItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedGalleryIndex(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedGalleryIndex(idx);
                    }
                  }}
                  className="mb-4 sm:mb-5 break-inside-avoid cursor-pointer group rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                >
                  <div className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-black/40">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.dimensions && (
                      <span className="absolute top-2 left-2 text-[9px] font-mono uppercase bg-white/90 dark:bg-black/70 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded">
                        {item.dimensions}
                      </span>
                    )}
                    {/* Overlay judul pas di-hover, khas kartu Pinterest */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Detail — dibuka pas salah satu kartu di grid diklik */
            <div className="space-y-6 view-reveal">
              <button
                onClick={() => setSelectedGalleryIndex(null)}
                className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#2B579A] dark:hover:text-[#6FA8DC] bg-gray-100 dark:bg-[#2d2d2d] px-3 py-1.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
              >
                &larr; Kembali ke {gallerySubTab === 'poster' ? 'Poster' : 'Photo'}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-6 md:gap-10 items-start">
                <div className="w-full rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-black/40 flex items-center justify-center">
                  <img
                    src={selectedGalleryItem.imageUrl}
                    alt={selectedGalleryItem.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto max-h-[78vh] object-contain"
                  />
                </div>

                <div className="space-y-3">
                  {selectedGalleryItem.dimensions && (
                    <span className="text-[10px] font-mono uppercase bg-[#2B579A]/10 dark:bg-[#6FA8DC]/15 text-[#2B579A] dark:text-[#6FA8DC] px-2 py-0.5 rounded border border-[#2B579A]/30 dark:border-[#6FA8DC]/30 inline-block">
                      {selectedGalleryItem.dimensions}
                    </span>
                  )}
                  {selectedGalleryItem.category && (
                    <span className="text-[10px] font-mono uppercase text-gray-400 tracking-widest block">
                      {selectedGalleryItem.category}
                    </span>
                  )}

                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedGalleryItem.title}
                  </h2>

                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedGalleryItem.description}
                  </p>

                  {activeGalleryItems.length > 1 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-400">
                        {gallerySubTab === 'poster' ? 'Poster' : 'Foto'} {selectedGalleryIndex + 1} dari {activeGalleryItems.length}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={prevGalleryItem}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] text-xs font-semibold rounded text-gray-800 dark:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                        >
                          &larr; Prev
                        </button>
                        <button
                          onClick={nextGalleryItem}
                          className="px-3 py-1.5 bg-[#2B579A] hover:bg-[#1e3f73] dark:bg-[#6FA8DC] dark:hover:bg-[#5a95c9] text-xs font-semibold rounded text-white dark:text-[#1a1a1a] shadow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B579A] dark:focus-visible:ring-[#6FA8DC] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161616]"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= MODAL SHARE ARTIKEL ======================= */}
      {shareArticle && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShareArticle(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden view-reveal"
          >
            {/* Preview card artikel yang mau di-share */}
            <div className="relative">
              {shareArticle.image ? (
                <div className="w-full aspect-[16/9] bg-gray-100 dark:bg-black/40">
                  <img src={shareArticle.image} alt={shareArticle.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full aspect-[16/9] bg-gradient-to-br from-[#2B579A] to-[#6FA8DC] flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                </div>
              )}
              <button
                onClick={() => setShareArticle(null)}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                title="Tutup"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                {shareArticle.category && (
                  <span className="inline-block bg-green-600 text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 mb-1.5">
                    {shareArticle.category}
                  </span>
                )}
                <h3 className="text-white text-sm font-bold leading-snug line-clamp-2">
                  {shareArticle.title}
                </h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{shareArticle.snippet}</p>

              {/* Tombol platform share */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    name: 'WhatsApp',
                    href: `https://wa.me/?text=${encodeURIComponent(`${shareArticle.title} — ${buildShareUrl(shareArticle)}`)}`,
                    bg: 'bg-[#25D366]',
                    icon: <path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.27-.1-.46-.15-.66.15-.2.3-.76.94-.93 1.14-.17.2-.34.22-.63.08-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.5.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.19-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.48 1.7.62.71.22 1.36.19 1.87.12.57-.09 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.57-.34z" />,
                  },
                  {
                    name: 'X',
                    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareArticle.title)}&url=${encodeURIComponent(buildShareUrl(shareArticle))}`,
                    bg: 'bg-black',
                    icon: <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />,
                  },
                  {
                    name: 'Facebook',
                    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareUrl(shareArticle))}`,
                    bg: 'bg-[#1877F2]',
                    icon: <path d="M15 4h-2a4 4 0 00-4 4v2H7v3h2v7h3v-7h2.5l.5-3H12V8a1 1 0 011-1h2z" strokeLinejoin="round" />,
                  },
                  {
                    name: 'LinkedIn',
                    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(buildShareUrl(shareArticle))}`,
                    bg: 'bg-[#0A66C2]',
                    icon: <><rect x="3" y="9" width="4" height="12" /><circle cx="5" cy="4" r="2" /><path d="M11 9v12M11 13c0-2 2-4 4-4s4 2 4 4v8" /></>,
                  },
                ].map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Share ke ${p.name}`}
                    className={`flex flex-col items-center gap-1 group`}
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform ${p.bg}`}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{p.icon}</svg>
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">{p.name}</span>
                  </a>
                ))}
              </div>

              {/* Copy link */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={buildShareUrl(shareArticle)}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 text-[10px] font-mono px-2.5 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400 truncate"
                />
                <button
                  onClick={() => handleCopyLink(shareArticle)}
                  className="shrink-0 text-[11px] font-semibold px-3 py-2 rounded bg-gray-800 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
                >
                  {linkCopied ? 'Disalin!' : 'Salin'}
                </button>
              </div>
            </div>
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