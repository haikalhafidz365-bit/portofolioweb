// src/App.jsx
import React, { useState, useEffect } from 'react';
import { initialPortfolioData } from './cms/CmsData';
import { supabase } from './lib/supabaseClient';
import { initAnalytics, trackPageView } from './lib/analytics';

// Import Komponen Halaman Publik
import Home from './pages/Home';
import About from './pages/About';
import Career from './pages/Career';
import Book from './pages/Book';
import Projects from './pages/Projects';
import Contact from './pages/Contact';

// Import Komponen Ala Microsoft Word & CMS
import TitleBar from './components/TitleBar';
import Ribbon from './components/Ribbon';
import Ruler from './components/Ruler';
import StatusBar from './components/StatusBar';
import CmsDashboard from './cms/CmsDashboard';
import WelcomeToast from './components/WelcomeToast';
import WatermarkBackground from './components/WatermarkBackground';
import CommentTicker from './components/CommentTicker';
import PrintPortfolio from './components/PrintPortfolio';
import PelicanLoader from './components/PelicanLoader';

// Menghitung total kata secara rekursif dari objek/array data apapun (dipakai untuk word count di StatusBar)
function countWords(value) {
  if (value == null) return 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countWords(item), 0);
  }
  if (typeof value === 'object') {
    return Object.values(value).reduce((sum, v) => sum + countWords(v), 0);
  }
  return 0;
}

// Password buat masuk Admin Only — ganti ke password lo sendiri, mang!
// (Catatan: ini proteksi sisi client doang, cukup buat nyegah orang iseng klik-klik.
//  Bukan security beneran karena siapapun bisa lihat ini kalau buka source code JS-nya.)
const ADMIN_PASSWORD = 'mangkukbesar';

// Skala dasar tampilan dokumen KHUSUS DESKTOP — ini "zoom out by system" yang diminta,
// TERPISAH dari slider zoom manual di StatusBar/Ruler (itu tetep nunjuk 50-200%, defaultnya 100%).
// Angka render final = (zoomLevel dari slider / 100) dikali BASE_VIEW_SCALE ini.
// Di HP, skala ini SENGAJA GAK DIPAKAI (lihat isMobileLayout di bawah) — dokumen dibikin
// full-width & fluid, bukan ala "kertas Word" yang di-scale-down, karena itu yang bikin
// tampilan HP berantakan.
const BASE_VIEW_SCALE = 0.9;

// Ukuran pt "netral" yang jadi acuan skala 100% — dipilih 12pt karena itu default fontSize.
// Kenapa perlu ini: SEMUA teks di halaman-halaman lo (Home/About/Career/dst) pakai ukuran
// dari class Tailwind (text-sm, text-2xl, dst) yang satuannya "rem" — dan rem itu SELALU
// ngikutin ukuran font di <html> root, bukan elemen pembungkus terdekat manapun. Makanya,
// nyetel fontSize cuma lewat inline style di pembungkus dokumen TIDAK BISA nembus ke situ.
// Solusinya: ukuran pt dari Ribbon diterjemahin jadi faktor skala visual (mirip cara kerja
// Zoom), lalu digabung ke transform scale yang sama di bawah. Jadi milih ukuran font lebih
// besar/kecil di Ribbon beneran keliatan efeknya di seluruh isi dokumen — termasuk di Home.
const FONT_SIZE_BASELINE_PT = 12;

// Breakpoint bawah dari sini dianggap "HP" — dipakai buat matiin efek kertas Word,
// sembunyiin Ruler, dan nyederhanain TitleBar/StatusBar secara OTOMATIS (bukan manual toggle).
const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';

// ID baris tetap di tabel `portfolio` — kita cuma pakai 1 baris yang terus di-update.
const PORTFOLIO_ROW_ID = 1;

export default function App() {
  const [portfolioData, setPortfolioData] = useState(initialPortfolioData);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Ambil data dari Supabase sekali pas app pertama kali dibuka.
  // Ini yang bikin data konsisten di semua device/browser/akun — bukan lagi localStorage.
  useEffect(() => {
    let ignore = false;

    async function loadPortfolioData() {
      const { data, error } = await supabase
        .from('portfolio')
        .select('data')
        .eq('id', PORTFOLIO_ROW_ID)
        .single();

      if (ignore) return;

      if (error) {
        console.error('Gagal ambil data dari Supabase:', error);
        setLoadError(
          'Gagal konek ke server. Pastikan .env sudah diisi & tabel "portfolio" sudah dibikin. ' +
          'Sementara nampilin data default.'
        );
        setPortfolioData(initialPortfolioData);
      } else if (data?.data && Object.keys(data.data).length > 0) {
        setPortfolioData(data.data);
      } else {
        // Baris ada tapi masih kosong (baru setup) → pakai default template.
        setPortfolioData(initialPortfolioData);
      }
      setIsLoading(false);
    }

    loadPortfolioData();
    return () => { ignore = true; };
  }, []);

  // Dipanggil dari CmsDashboard pas admin klik "Save Changes".
  // Return true/false biar CmsDashboard tau apakah save-nya berhasil.
  const savePortfolioData = async (newData) => {
    setSaveError(null);
    const { error } = await supabase
      .from('portfolio')
      .update({ data: newData, updated_at: new Date().toISOString() })
      .eq('id', PORTFOLIO_ROW_ID);

    if (error) {
      console.error('Gagal simpan ke Supabase:', error);
      setSaveError('Gagal simpan perubahan ke server. Cek koneksi internet lo & coba lagi.');
      return false;
    }

    setPortfolioData(newData);
    return true;
  };

  // Baca deep-link dari URL pas app pertama kali dibuka (mis. ?tab=Projects&article=art-1),
  // dipakai buat fitur Share artikel — biar link yang di-share beneran ngarah ke artikel
  // yang dimaksud, bukan cuma mendarat di Home. `initialArticleId` diteruskan ke Projects.jsx.
  const VALID_TABS = ['Home', 'About', 'Career', 'Book', 'Projects', 'Contact'];
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlTab = urlParams?.get('tab');
  const initialArticleId = urlParams?.get('article') || null;

  const [activeTab, setActiveTab] = useState(
    VALID_TABS.includes(urlTab) ? urlTab : 'Home'
  );

  // Begitu tab/article dari deep-link kepake buat nentuin tampilan awal, langsung bersihin
  // URL-nya balik ke root (tanpa reload) pake history.replaceState. Ini SENGAJA dilakukan
  // biar kalau visitor nge-bookmark / save-to-home-screen / browser-nya autocomplete ke
  // URL itu lagi nanti, yang ke-save udah URL polos — bukan nyangkut permanen di tab
  // artikel yang pernah di-share. Fitur share artikel sendiri TETEP jalan normal (link-nya
  // masih valid sekali buka), ini cuma nyegah dia "nempel" jadi default buat kunjungan
  // berikutnya.
  useEffect(() => {
    if (urlTab || initialArticleId) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Nyalain Google Analytics (GA4) sekali pas app pertama kali kebuka — otomatis gak
  // ngapa-ngapain kalau .env belum diisi VITE_GA_MEASUREMENT_ID (lihat src/lib/analytics.js).
  useEffect(() => {
    initAnalytics();
  }, []);

  const [darkMode, setDarkMode] = useState(false);
  const [isAdminMode, setIsAdminModeRaw] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(
    () => sessionStorage.getItem('cms_admin_authed') === 'true'
  );

  // Kirim "page view" tiap kali visitor pindah tab (Home/About/Career/dst) — biar
  // tiap tab kehitung sebagai halaman sendiri di laporan Analytics, bukan cuma
  // sekali doang pas web pertama dibuka. Skip pas lagi di Admin Mode.
  useEffect(() => {
    if (!isAdminMode) {
      trackPageView(activeTab);
    }
  }, [activeTab, isAdminMode]);


  // Deteksi layar sempit (HP) SECARA OTOMATIS lewat matchMedia — bukan toggle manual.
  // Ini beneran ngikutin lebar browser asli, jadi kalau dibuka dari HP sungguhan
  // (misal abis di-publish ke Netlify), otomatis kepakai tanpa visitor perlu ngapa-ngapain.
  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = () => setIsMobileLayout(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Dipanggil kapanpun mau KELUAR dari admin mode (Exit Admin, Save, atau Cancel) —
  // status login-nya ikut direset, jadi lain kali mau masuk admin lagi wajib password ulang.
  const exitAdminMode = () => {
    setIsAdminModeRaw(false);
    setIsAdminAuthed(false);
    sessionStorage.removeItem('cms_admin_authed');
  };

  // Dipanggil dari tombol "Admin Only" di TitleBar. Kalau mau MASUK admin mode dan
  // belum login di percobaan ini, buka modal password (bukan window.prompt lagi — prompt
  // bawaan browser gak bisa di-mask jadi titik/pagar, makanya dipindah ke input sendiri).
  // Kalau mau KELUAR (Exit Admin), langsung logout tanpa password.
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordWrong, setPasswordWrong] = useState(false);

  const handleSetIsAdminMode = (wantsAdmin) => {
    if (!wantsAdmin) {
      exitAdminMode();
      return;
    }
    if (isAdminAuthed) {
      setIsAdminModeRaw(true);
      alert('ada yang bisa dibanting di sini?');
      return;
    }
    setPasswordInput('');
    setPasswordWrong(false);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthed(true);
      sessionStorage.setItem('cms_admin_authed', 'true');
      setIsAdminModeRaw(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      alert('ada yang bisa dibanting di sini?');
    } else {
      setPasswordWrong(true);
      setPasswordInput('');
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordWrong(false);
  };

  // Dipanggil dari CmsDashboard pas Save. Simpen ke Supabase doang — TIDAK keluar dari
  // admin mode. CmsDashboard sendiri yang nentuin balik ke menu tab (bukan App.jsx),
  // biar admin tetep di dalem fitur CMS sampe dia beneran klik "Exit Admin".
  const handleCmsSave = async (newData) => {
    const success = await savePortfolioData(newData);
    return success;
  };

  // State Editor Word
  const [fontFamily, setFontFamily] = useState('Garamond');
  const [fontSize, setFontSize] = useState(12);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewMode, setViewMode] = useState('web');

  // Data & word count dinamis sesuai tab yang lagi aktif
  const activeTabDataMap = {
    Home: portfolioData.home,
    About: portfolioData.about,
    Career: portfolioData.career,
    Book: portfolioData.books,
    Projects: portfolioData.projects,
    Contact: portfolioData.contact,
  };
  const currentWordCount = countWords(activeTabDataMap[activeTab]);

  // Sementara data masih di-fetch dari Supabase, tampilin loading simpel
  // biar gak kelihatan "flash" dari data default ke data asli.
  if (isLoading) {
    return <PelicanLoader />;
  }

  // Dipanggil dari tombol "Download PDF" di tab Home. Trigger dialog print bawaan
  // browser — visitor tinggal pilih tujuan "Save as PDF". Yang beneran di-print
  // adalah <PrintPortfolio> (dirender tersembunyi di bawah, isinya SEMUA tab
  // dibentang penuh), bukan tampilan Word yang lagi aktif ini.
  const handleDownloadPdf = () => {
    window.print();
  };

  const documentBody = (
    <div className={`relative z-10 w-full h-full ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''} ${isUnderline ? 'underline' : ''}`}>
      {activeTab === 'Home' && <Home data={portfolioData.home} onDownloadPdf={handleDownloadPdf} />}
      {activeTab === 'About' && <About data={portfolioData.about} />}
      {activeTab === 'Career' && <Career data={portfolioData.career} />}
      {activeTab === 'Book' && <Book data={portfolioData.books} />}
      {activeTab === 'Projects' && <Projects data={portfolioData.projects} initialArticleId={initialArticleId} />}
      {activeTab === 'Contact' && <Contact data={portfolioData.contact} />}
    </div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="print:hidden min-h-screen bg-[#e6e6e6] dark:bg-[#181818] flex flex-col justify-between selection:bg-blue-500 selection:text-white">

        {/* Pesan error kalau gagal konek/simpen ke Supabase */}
        {(loadError || saveError) && (
          <div className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-mono text-center py-2 px-4">
            {loadError || saveError}
          </div>
        )}

        {/* Modal password buat masuk Admin Only — pakai input type="password" beneran
            (otomatis di-mask jadi titik/pagar sama browser), bukan window.prompt lagi. */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
            <form
              onSubmit={handlePasswordSubmit}
              className="w-full max-w-xs bg-white dark:bg-[#202020] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
            >
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Masuk Admin</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Masukkan password admin buat lanjut.</p>
              <input
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordWrong(false); }}
                placeholder="Password"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-[#2b579a]"
              />
              {passwordWrong && (
                <p className="text-xs text-red-500 font-medium">Password salah, mang.</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePasswordCancel}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#2b579a] hover:bg-[#1e3f73] text-white shadow transition-colors"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 1. Baris Judul Paling Atas — otomatis nyederhanain diri di layar sempit lewat class Tailwind di dalamnya */}
        <TitleBar 
          isAdminMode={isAdminMode}
          setIsAdminMode={handleSetIsAdminMode}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSave={() => alert('Perubahan disimpan!')}
        />

        {/* Balon kutipan berjalan — nempel ke tepi kanan VIEWPORT (position: fixed), SENGAJA
            dipasang di sini (di luar div kertas yang punya transform: scale saat zoom),
            biar dia gak ikut ke-scale dan ukurannya tetep konsisten. Otomatis disembunyiin
            di HP (gak ada ruang kosong buat itu) & pas Admin Mode kebuka. */}
        {!isMobileLayout && !isAdminMode && (
          <CommentTicker quotes={portfolioData.quotes} />
        )}

        {/* Notifikasi welcome — beda dari CommentTicker di atas, ini SENGAJA tetep muncul
            di HP juga (posisinya ngikutin isMobileLayout di dalam komponennya sendiri). */}
        {!isAdminMode && (
          <WelcomeToast
            settings={portfolioData.general?.welcomeNotification}
            isMobileLayout={isMobileLayout}
          />
        )}

        {/* 2. Konten Utama: Admin CMS atau Lembar Dokumen */}
        {isAdminMode ? (
          <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full bg-white dark:bg-[#202020] my-4 sm:my-6 rounded shadow-lg">
            <CmsDashboard 
              data={portfolioData} 
              onSave={handleCmsSave} 
              onClose={exitAdminMode} 
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center">
            
            {/* Ribbon Menu (Cukup dipanggil sekali di sini, jangan diduplikat!) */}
            <div className="w-full sticky top-0 z-40 shadow-sm">
              <Ribbon 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                fontSize={fontSize}
                setFontSize={setFontSize}
                isBold={isBold}
                setIsBold={setIsBold}
                isItalic={isItalic}
                setIsItalic={setIsItalic}
                isUnderline={isUnderline}
                setIsUnderline={setIsUnderline}
                isMobileLayout={isMobileLayout}
              />
            </div>

            {/* Penggaris Dokumen — HANYA tampil di desktop. Di HP gak relevan & cuma makan tempat,
                jadi disembunyiin otomatis (bukan berdasarkan toggle manual). */}
            {!isMobileLayout && (
              <Ruler zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
            )}

            {/* Lembar Kertas Utama — di HP dibikin nempel penuh (gak ada padding/gap abu-abu
                di sekitarnya) dan flex-1 biar ngisi sisa tinggi layar, jadi berasa kayak app
                native, bukan "kertas di atas meja abu-abu". Desktop TIDAK berubah sama sekali. */}
            <div className={
              isMobileLayout
                ? 'w-full flex-1 flex justify-center overflow-x-auto overflow-y-visible'
                : 'w-full flex justify-center py-2 sm:py-4 px-0 sm:px-2 overflow-x-auto overflow-y-visible'
            }>
              {isMobileLayout ? (
                // ===== DI HP: full-width & fluid, TANPA efek "kertas Word" & TANPA di-scale.
                // Ini yang paling nentuin — versi lama maksa lebar/skala dokumen dekstop
                // ke layar kecil, itu penyebab utama tampilannya berantakan pas dibuka di HP.
                <div
                  className="relative w-full px-4 py-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-[#202020]"
                  style={{
                    fontFamily,
                    fontSize: `${fontSize}pt`,
                    transform: `scale(${fontSize / FONT_SIZE_BASELINE_PT})`,
                    transformOrigin: 'top center'
                  }}
                >
                  <WatermarkBackground odds={portfolioData.odds} />
                  {documentBody}
                </div>
              ) : (
                <div 
                  className={`relative transition-all duration-300 text-gray-900 dark:text-gray-100 ${
                    viewMode === 'print' 
                      ? 'word-page' 
                      : 'w-full max-w-4xl bg-white dark:bg-[#202020] p-8 min-h-[500px] rounded shadow-xl border border-gray-300 dark:border-gray-700'
                  }`}
                  style={{ 
                    fontFamily: fontFamily, 
                    fontSize: `${fontSize}pt`,
                    transform: `scale(${(zoomLevel / 100) * BASE_VIEW_SCALE * (fontSize / FONT_SIZE_BASELINE_PT)})`,
                    transformOrigin: 'top center'
                  }}
                >
                  <WatermarkBackground odds={portfolioData.odds} />
                  {documentBody}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. Status Bar Bawah — otomatis nyederhanain diri di layar sempit lewat class Tailwind di dalamnya */}
        <StatusBar 
          activePage={activeTab}
          wordCount={currentWordCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isMobileLayout={isMobileLayout}
        />

      </div>

      {/* Versi khusus buat Download PDF — normalnya tersembunyi total (lihat class
          "hidden print:block" di dalam komponennya), cuma nongol pas dialog print aktif. */}
      <PrintPortfolio data={portfolioData} />
    </div>
  );
}