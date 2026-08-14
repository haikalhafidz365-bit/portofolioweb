// src/App.jsx
import React, { useState, useEffect } from 'react';
import { initialPortfolioData } from './cms/CmsData';
import { supabase } from './lib/supabaseClient';
import { initAnalytics, trackPageView } from './lib/analytics';
import { setPageMeta } from './lib/pageMeta';

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
import HintToggle from './components/HintToggle';
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

// GANTI ke email akun admin yang lo bikin di Supabase Auth (Dashboard → Authentication →
// Users → Add user). Password-nya SUDAH GAK ADA lagi di file ini — proteksinya sekarang
// beneran divalidasi di server oleh Supabase Auth + Row Level Security di tabel
// `portfolio`, bukan cuma dicocokin string di JS kayak sebelumnya (yang gampang dibaca
// siapa aja dari bundle JS via DevTools).
const ADMIN_EMAIL = 'haikalhafidz365@gmail.com';

// Skala dasar tampilan dokumen KHUSUS DESKTOP — ini "zoom out by system" yang diminta,
// TERPISAH dari slider zoom manual di StatusBar/Ruler (itu tetep nunjuk 50-200%, defaultnya 100%).
// Angka render final = (zoomLevel dari slider / 100) dikali BASE_VIEW_SCALE ini.
// Di HP, skala ini SENGAJA GAK DIPAKAI (lihat isMobileLayout di bawah) — dokumen dibikin
// full-width & fluid, bukan ala "kertas Word" yang di-scale-down, karena itu yang bikin
// tampilan HP berantakan.
const BASE_VIEW_SCALE = 0.9;

// Ukuran pt default fontSize (dipakai sebagai nilai awal state `fontSize`, BUKAN lagi
// dipakai buat itung faktor scale/zoom — lihat catatan di bawah).
//
// CATATAN SEJARAH (biar gak keulang lagi kalau ada yang nyoba "benerin" ini balik lagi):
// Dulu nilai pt dari Ribbon diterjemahin jadi faktor `transform: scale(...)` yang digabung
// ke transform zoom di bawah. Itu SALAH — efeknya beneran cuma kayak nge-zoom seluruh
// kertas (gambar, spacing, border ikut membesar/mengecil semua), BUKAN beneran ngubah
// ukuran huruf doang. Sekarang pendekatannya: fontSize dipasang murni lewat inline style
// `fontSize: ${fontSize}pt` di pembungkus dokumen, dan supaya itu beneran nembus ke teks
// di dalam Home/About/Career/dst, semua class ukuran teks Tailwind di halaman-halaman itu
// udah dikonversi dari `rem` (text-sm, text-2xl, dst — yang SELALU ngikut <html> root, gak
// peduli pembungkusnya) ke `em` arbitrary value (text-[0.875em], dst — yang ngikut font-size
// elemen pembungkus terdekat). Jadi sekarang: geser slider font size = teks membesar &
// reflow, layout/gambar/lebar kertas tetep. Geser slider Zoom (Ruler) = baru itu yang
// beneran scale seluruh kertas.
const FONT_SIZE_BASELINE_PT = 12;

// Breakpoint bawah dari sini dianggap "HP" — dipakai buat matiin efek kertas Word,
// sembunyiin Ruler, dan nyederhanain TitleBar/StatusBar secara OTOMATIS (bukan manual toggle).
const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';

// ID baris tetap di tabel `portfolio` — kita cuma pakai 1 baris yang terus di-update.
const PORTFOLIO_ROW_ID = 1;

// Default & jaring pengaman buat field `general` — SAMA PERSIS kayak yang ada di
// CmsDashboard.jsx (DEFAULT_GENERAL / normalizeGeneral di sana). Ini WAJIB
// dipasang juga di sini (bukan cuma di form edit CMS-nya), soalnya kalau baris di
// Supabase belum punya field `general` sama sekali (mis. data lama dari sebelum
// field ini ditambahin), tanpa normalisasi ini `portfolioData.general` bakal
// `undefined` → WelcomeToast nganggep `enabled` juga `undefined` (falsy) → notif
// welcome-nya gak pernah muncul di halaman publik, PADAHAL di CMS Dashboard
// toggle-nya keliatan "Aktif" (karena normalisasi versi CmsDashboard cuma dipakai
// buat form edit-nya doang, gak nembus ke sini).
const DEFAULT_GENERAL = {
  welcomeNotification: {
    enabled: true,
    title: 'Selamat datang! 👋',
    message: 'Terima kasih udah mampir ke portofolio saya. Semoga betah!',
    delaySeconds: 2,
  },
};
const normalizeGeneral = (raw) => ({
  welcomeNotification: {
    ...DEFAULT_GENERAL.welcomeNotification,
    ...(raw?.welcomeNotification || {}),
  },
});

// Jaring pengaman yang sama buat `quotes` — dulu field ini gak ada sama sekali di
// initialPortfolioData, jadi kalau baris Supabase belum/gak punya field `quotes`,
// portfolioData.quotes bakal `undefined` (bukan array kosong) begitu dilempar ke
// CommentTicker. Sekarang initialPortfolioData udah dikasih `quotes: []` juga (lihat
// CmsData.js), tapi normalisasi di sini WAJIB tetep dipasang buat baris data LAMA di
// Supabase yang udah kesave dari sebelum field ini ditambahin.
const normalizeQuotes = (raw) => (Array.isArray(raw) ? raw : []);

export default function App() {
  const [portfolioData, setPortfolioData] = useState(initialPortfolioData);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Dua syarat yang HARUS dua-duanya kepenuhin sebelum layar loading (PelicanLoader)
  // ditutup: (1) data dari Supabase udah kelar diambil, (2) pesan di splash-nya
  // udah kelar diketik + jeda baca-nya (lihat prop `holdAfterMs` di PelicanLoader)
  // udah kelewat. Jadi walau fetch-nya kenceng banget, tetep nunggu pesannya
  // "tersampaikan" dulu — dan walau fetch-nya lambat, teksnya juga gak keburu
  // hilang sebelum data selesai disiapin.
  const [isDataReady, setIsDataReady] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(false);
  useEffect(() => {
    if (isDataReady && isSplashDone) {
      setIsLoading(false);
    }
  }, [isDataReady, isSplashDone]);

  // Ambil data dari Supabase sekali pas app pertama kali dibuka.
  // Ini yang bikin data konsisten di semua device/browser/akun — bukan lagi localStorage.
  useEffect(() => {
    let ignore = false;

    async function loadPortfolioData() {
      try {
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
          setPortfolioData({
            ...data.data,
            general: normalizeGeneral(data.data.general),
            quotes: normalizeQuotes(data.data.quotes),
          });
        } else {
          // Baris ada tapi masih kosong (baru setup) → pakai default template.
          setPortfolioData(initialPortfolioData);
        }
      } catch (err) {
        // Beda dari `error` di atas (yang di-return rapi sama Supabase) — ini nangkep
        // kegagalan yang beneran nge-throw (mis. .env belum keisi/salah, client gagal
        // ke-init, network putus total). TANPA try/catch ini, exception di atas bakal
        // ngehentiin fungsi ini di tengah jalan SEBELUM sempet manggil setIsDataReady,
        // yang bikin isLoading nyangkut `true` selamanya — splash loading gak akan
        // pernah ketutup, dan semua yang di bawahnya (termasuk WelcomeToast) gak akan
        // pernah sempet dirender sama sekali.
        if (ignore) return;
        console.error('Gagal ambil data dari Supabase (exception):', err);
        setLoadError(
          'Gagal konek ke server. Pastikan .env sudah diisi & tabel "portfolio" sudah dibikin. ' +
          'Sementara nampilin data default.'
        );
        setPortfolioData(initialPortfolioData);
      } finally {
        if (!ignore) setIsDataReady(true);
      }
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

  // Status login admin SEKARANG ngikutin session Supabase Auth yang beneran (JWT
  // tervalidasi server), BUKAN lagi sessionStorage flag polos yang dulu ada di sini.
  // Dulu itu gampang di-bypass: buka console browser, ketik
  // `sessionStorage.setItem('cms_admin_authed', 'true')`, refresh — langsung masuk
  // admin tanpa password sama sekali, karena "otentikasi"-nya cuma nge-cek string di
  // JS. Supabase-js otomatis nyimpen & nge-refresh session-nya sendiri (di
  // localStorage), jadi di sini kita tinggal DENGERIN status-nya, gak perlu ngatur
  // penyimpanannya manual lagi.
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  useEffect(() => {
    let ignore = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ignore) setIsAdminAuthed(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminAuthed(!!session);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  // Mode "Full Screen" — dipanggil dari tombol di TitleBar. Pakai Fullscreen API bawaan
  // browser (bikin seluruh tab expand nutupin address bar dkk), BUKAN cuma gede-gedein
  // elemen di CSS doang. `isFullscreen` disinkronin ke event `fullscreenchange` juga
  // (bukan cuma di-set manual pas klik tombol), soalnya user bisa keluar full screen
  // lewat cara lain di luar tombol kita (misal pencet Esc, atau klik UI browser) — kalau
  // gak disinkronin, status tombol bisa "nyangkut" gak sesuai kenyataan.
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // documentElement dipilih (bukan cuma div kertas) biar TitleBar/Ribbon/StatusBar
        // ikut kepake pas full screen, bukan cuma kontennya doang.
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      // Beberapa browser/situasi (mis. iframe tanpa izin, atau browser lawas yang gak
      // dukung Fullscreen API) bisa nolak request-nya — diamkan aja, tombolnya tetep
      // ada tapi gak ngefek, daripada bikin app crash.
      console.warn('Full screen tidak didukung atau ditolak:', err);
    }
  };

  // Mode "Hint" — toggle dari tombol HintToggle di pojok kiri atas. Pas true, semua
  // elemen `data-hint-id` di tab yang lagi kebuka ikutan blink (lihat class
  // `.hint-mode-active` di CSS global bawah). SENGAJA gak ada auto-off pas ganti tab
  // (activeTab) — biar visitor bisa nyalain hint sekali terus keliling semua tab
  // sambil hint-nya tetep nyala, sampe dia matiin manual lewat tombolnya lagi.
  const [hintActive, setHintActive] = useState(false);

  // Kirim "page view" tiap kali visitor pindah tab (Home/About/Career/dst) — biar
  // tiap tab kehitung sebagai halaman sendiri di laporan Analytics, bukan cuma
  // sekali doang pas web pertama dibuka. Skip pas lagi di Admin Mode.
  useEffect(() => {
    if (!isAdminMode) {
      trackPageView(activeTab);
    }
  }, [activeTab, isAdminMode]);

  // Update <title> browser + meta description/Open Graph/Twitter Card tiap kali pindah
  // tab, biar tiap halaman punya identitas sendiri (bukan cuma judul situs polos terus-
  // terusan) — dan biar ada baseline OG tag yang kepasang duluan sebelum Projects.jsx
  // nge-override lagi jadi lebih spesifik pas satu artikel dibuka (lihat pageMeta.js buat
  // catatan penting soal batasan client-side meta tag ini buat preview share). Skip pas
  // Admin Mode karena lagi di CMS, bukan halaman publik yang mau di-share orang.
  useEffect(() => {
    if (isAdminMode) return;
    const tabMeta = {
      Home: {
        title: portfolioData.home?.name,
        description: portfolioData.home?.bio,
        image: portfolioData.home?.photoUrl,
      },
      About: {
        title: 'About',
        description: portfolioData.about?.live,
      },
      Career: {
        title: portfolioData.career?.heading || 'Career',
        description: portfolioData.career?.subheading,
      },
      Book: {
        title: portfolioData.books?.heading || 'Book',
        description: portfolioData.books?.subheading,
      },
      Projects: {
        title: portfolioData.projects?.heading || 'Projects',
        description: portfolioData.projects?.subheading,
      },
      Contact: {
        title: 'Contact',
        description: portfolioData.contact?.subheading,
      },
    };
    setPageMeta(tabMeta[activeTab] || {});
  }, [activeTab, portfolioData, isAdminMode]);


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
  // signOut Supabase Auth beneran (bukan cuma hapus flag lokal), jadi session/token-nya
  // beneran diinvalidasi. isAdminAuthed otomatis ke-update ke false lewat listener
  // onAuthStateChange di atas — gak perlu di-set manual di sini.
  const exitAdminMode = () => {
    setIsAdminModeRaw(false);
    supabase.auth.signOut();
  };

  // Dipanggil dari tombol "Admin Only" di TitleBar. Kalau mau MASUK admin mode dan
  // belum login di percobaan ini, buka modal password (bukan window.prompt lagi — prompt
  // bawaan browser gak bisa di-mask jadi titik/pagar, makanya dipindah ke input sendiri).
  // Kalau mau KELUAR (Exit Admin), langsung logout tanpa password.
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordWrong, setPasswordWrong] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);
    // Login beneran ke Supabase Auth — server yang validasi password-nya, bukan JS
    // di browser lagi. `data.data.session` yang dihasilkan ini yang nantinya dipake
    // sama Row Level Security di tabel `portfolio` buat ngizinin/nolak UPDATE.
    const { error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: passwordInput,
    });
    setIsSigningIn(false);

    if (!error) {
      // isAdminAuthed ke-update otomatis lewat listener onAuthStateChange di atas.
      setIsAdminModeRaw(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      alert('ada yang bisa dibanting di sini?');
    } else {
      console.error('Login admin gagal:', error.message);
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
  const [fontSize, setFontSize] = useState(FONT_SIZE_BASELINE_PT);
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
    return <PelicanLoader onFinished={() => setIsSplashDone(true)} />;
  }

  const documentBody = (
    <div className={`relative z-10 w-full h-full ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''} ${isUnderline ? 'underline' : ''}`}>
      {activeTab === 'Home' && <Home data={portfolioData.home} />}
      {activeTab === 'About' && <About data={portfolioData.about} />}
      {activeTab === 'Career' && <Career data={portfolioData.career} />}
      {activeTab === 'Book' && <Book data={portfolioData.books} />}
      {activeTab === 'Projects' && <Projects data={portfolioData.projects} initialArticleId={initialArticleId} />}
      {activeTab === 'Contact' && <Contact data={portfolioData.contact} />}
    </div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className={`print:hidden min-h-screen bg-[#e6e6e6] dark:bg-[#181818] flex flex-col justify-between selection:bg-blue-500 selection:text-white ${hintActive ? 'hint-mode-active' : ''}`}>

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
                disabled={isSigningIn}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-[#2b579a] disabled:opacity-60"
              />
              {passwordWrong && (
                <p className="text-xs text-red-500 font-medium">Password salah, mang.</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePasswordCancel}
                  disabled={isSigningIn}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#2b579a] hover:bg-[#1e3f73] text-white shadow transition-colors disabled:opacity-60"
                >
                  {isSigningIn ? 'Memeriksa...' : 'Masuk'}
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
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onSave={() => alert('Perubahan disimpan!')}
          activeTab={activeTab}
        />

        {/* Balon kutipan berjalan — nempel ke tepi kanan VIEWPORT (position: fixed), SENGAJA
            dipasang di sini (di luar div kertas yang punya transform: scale saat zoom),
            biar dia gak ikut ke-scale dan ukurannya tetep konsisten. Otomatis disembunyiin
            di HP (gak ada ruang kosong buat itu) & pas Admin Mode kebuka. */}
        {!isMobileLayout && !isAdminMode && (
          <CommentTicker quotes={portfolioData.quotes} />
        )}

        {/* Tombol "Hint" — nempel di pojok KIRI ATAS, di luar kertas A4. Diklik = toggle
            mode hint on/off, yang bikin semua elemen `data-hint-id` di tab yang lagi
            kebuka ikut blink (lihat CSS `.hint-mode-active` di bawah). GANTI dari
            GuidanceNote lama (kotak teks statis per-tab). Sama kayak sebelumnya:
            disembunyiin di HP & pas Admin Mode, dipasang di luar div kertas yang
            punya transform: scale biar posisinya gak ikut ke-scale pas zoom. */}
        {!isMobileLayout && !isAdminMode && (
          <HintToggle active={hintActive} onToggle={() => setHintActive((v) => !v)} />
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
              <Ruler zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} activeTab={activeTab} />
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
                  }}
                >
                  {activeTab === 'Home' && <WatermarkBackground odds={portfolioData.odds} />}
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
                    transform: `scale(${(zoomLevel / 100) * BASE_VIEW_SCALE})`,
                    transformOrigin: 'top center'
                  }}
                >
                  {activeTab === 'Home' && <WatermarkBackground odds={portfolioData.odds} />}
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

        {/* CSS global mode Hint — cuma nyala pas class `.hint-mode-active` ada di wrapper
            (lihat atas). Nge-target SEMUA elemen `data-hint-id` yang lagi kerender di tab
            yang aktif, otomatis, tanpa perlu tau id-nya satu-satu. `outline` dipakai (bukan
            border) biar gak geser layout sedikitpun.
            Catatan: elemen di LUAR A4 (TitleBar/Ribbon/StatusBar/Ruler) SENGAJA cuma dikasih
            `data-hint-id` pas `activeTab === 'Home'` (lihat prop `activeTab` yang diteruskan
            ke tiap komponen itu) — jadi mode Hint di luar kertas cuma nyala khusus di tab
            Home, gak ikut nyala di tab lain. Gak butuh CSS tambahan di sini karena scoping-nya
            udah ditentuin di level komponen (attribute-nya ada/nggak), bukan di level CSS. */}
        <style>{`
          .hint-mode-active [data-hint-id] {
            position: relative;
            animation: hintPulse 1.5s ease-in-out infinite;
            outline: 2px solid #2B579A;
            outline-offset: 3px;
            border-radius: 6px;
          }
          .dark .hint-mode-active [data-hint-id] {
            outline-color: #6FA8DC;
          }
          @keyframes hintPulse {
            0%, 100% { outline-color: rgba(43, 87, 154, 0.35); box-shadow: 0 0 0 0 rgba(43, 87, 154, 0.25); }
            50% { outline-color: rgba(43, 87, 154, 1); box-shadow: 0 0 0 4px rgba(43, 87, 154, 0.12); }
          }
          @media (prefers-reduced-motion: reduce) {
            .hint-mode-active [data-hint-id] { animation: none; outline-color: #2B579A; }
          }
        `}</style>

      </div>
    </div>
  );
}