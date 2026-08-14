import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { supabase, IMAGES_BUCKET } from '../lib/supabaseClient';

const TABS = ['home', 'about', 'career', 'book', 'projects', 'contact', 'odds', 'quotes', 'general'];

// Metadata buat kartu menu utama CMS — cukup diedit di sini kalau mau ganti label/ikon/deskripsi
const TAB_META = {
  home: { label: 'Home', desc: 'Nama, role, bio singkat & foto profil' },
  about: { label: 'About', desc: 'Cerita Live, Life, Laugh' },
  career: { label: 'Career', desc: 'Riwayat kerja, pendidikan, pencapaian & sertifikat' },
  book: { label: 'Book', desc: 'Buku, tulisan & karya open-source' },
  projects: { label: 'Projects', desc: 'Artikel, Poster & tab tambahan bebas' },
  contact: { label: 'Contact', desc: 'Info kontak, sosmed & tombol aksi' },
  odds: { label: 'Odds', desc: 'Serpihan tulisan buat aksen latar di semua tab' },
  quotes: { label: 'Quotes', desc: 'Kutipan buat balon komentar berjalan di tepi kanan' },
  general: { label: 'General', desc: 'Pengaturan situs — notifikasi welcome, dll' },
};

const DEFAULT_GENERAL = {
  welcomeNotification: {
    enabled: true,
    title: 'Selamat datang! 👋',
    message: 'Terima kasih udah mampir ke portofolio saya. Semoga betah!',
    delaySeconds: 2,
  },
};

// Jaring pengaman kalau data lama di Supabase belum punya field `general` sama sekali,
// atau field welcomeNotification-nya cuma sebagian — gabungin sama default biar gak crash.
const normalizeGeneral = (raw) => ({
  welcomeNotification: {
    ...DEFAULT_GENERAL.welcomeNotification,
    ...(raw?.welcomeNotification || {}),
  },
});

// Kategori Career SEKARANG bebas ditambah/dihapus/diubah namanya lewat CMS (gak lagi
// di-hardcode Professional/School/College). Tiap kategori punya `type`:
//  - 'career': format lama — Posisi @ Instansi, periode, pop-up detail instansi.
//  - 'credential': format baru — nama pencapaian/sertifikat, penyelenggara, tanggal,
//    gambar bukti, link verifikasi (buat Achievements/Certificates/dll).
const CAREER_TYPE_LABEL = {
  career: 'Riwayat (Posisi @ Instansi)',
  credential: 'Pencapaian / Sertifikat',
};

const emptyCareerItem = () => ({
  id: `item-${Date.now()}`,
  role: '',
  company: '',
  location: '',
  period: '',
  description: '',
  hintEnabled: true,
  companyInfo: { name: '', address: '', photo: '', about: '' },
});

const emptyCredentialItem = () => ({
  id: `cred-${Date.now()}`,
  title: '',
  issuer: '',
  date: '',
  image: '',
  description: '',
  verifyUrl: '',
  hintEnabled: true,
});

const emptyCareerCategory = (type = 'career') => ({
  id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  type,
  bgImage: '',
  items: [],
});

// Jaga-jaga: data career di Supabase bisa aja masih format LAMA (key tetap
// school/college/professional, masing-masing { bgImage, items } atau array polos),
// sementara format BARU butuh { heading, subheading, categories: [...] }. Fungsi ini
// nyamain semua kemungkinan bentuk lama jadi format baru — kategori "school" SENGAJA
// didrop (dianggap gak relevan lagi), Professional & College dipertahankan.
function normalizeCareerData(raw) {
  const careerData = raw || {};

  if (Array.isArray(careerData.categories)) {
    return {
      heading: careerData.heading || '',
      subheading: careerData.subheading || '',
      categories: careerData.categories.map((cat) => ({
        id: cat.id || emptyCareerCategory().id,
        name: cat.name || '',
        type: cat.type === 'credential' ? 'credential' : 'career',
        bgImage: cat.bgImage || '',
        items: Array.isArray(cat.items) ? cat.items : [],
      })),
    };
  }

  const legacyToCategory = (raw, id, name) => {
    const legacy = Array.isArray(raw) ? { bgImage: '', items: raw } : (raw || {});
    return {
      id,
      name,
      type: 'career',
      bgImage: legacy.bgImage || '',
      items: Array.isArray(legacy.items) ? legacy.items : [],
    };
  };

  return {
    heading: careerData.heading || '',
    subheading: careerData.subheading || '',
    categories: [
      legacyToCategory(careerData.professional, 'professional', 'Professional'),
      legacyToCategory(careerData.college, 'college', 'College'),
    ],
  };
}

// Sama kayak career: jaga-jaga data books di Supabase masih array polos yang lama,
// padahal format baru butuh { heading, subheading, items }.
function normalizeBooksData(raw) {
  if (Array.isArray(raw)) return { heading: '', subheading: '', items: raw };
  if (raw && typeof raw === 'object') {
    return {
      heading: raw.heading || '',
      subheading: raw.subheading || '',
      items: Array.isArray(raw.items) ? raw.items : [],
    };
  }
  return { heading: '', subheading: '', items: [] };
}

const emptyBook = () => ({
  id: `book-${Date.now()}`,
  title: '',
  category: '',
  summary: '',
  fullDescription: '',
  coverImage: '',
  overviewImage: '',
  pageCount: '',
  actionText: '',
  actionUrl: '',
  hintEnabled: true,
});

const emptyArticle = () => ({
  id: `art-${Date.now()}`,
  title: '',
  date: '',
  category: '',
  author: '',
  snippet: '',
  content: '',
  image: '',
  hintEnabled: true,
});

const emptyPosterItem = () => ({
  id: `poster-item-${Date.now()}`,
  title: '',
  category: '',
  dimensions: '',
  imageUrl: '',
  description: '',
  hintEnabled: true,
});

// Tab tambahan bebas (di luar Articles & Poster bawaan) — tiap tab punya nama sendiri
// (label yang tampil di navigasi) + daftar kartu sederhana di dalamnya.
// `wordContent` = HTML hasil convert dari file .docx yang di-upload (BUKAN file
// mentahnya yang disimpen — cuma teksnya, udah dikonversi sekali pas upload di CMS,
// jadi pas ditampilin ke publik gak perlu convert ulang tiap buka halaman). Isinya
// dipake gantiin `description` di tampilan detail kalau ada (lihat Projects.jsx).
// `wordFileName` cuma buat ditampilin di CMS ini doang (biar admin tau file mana yang
// udah ke-upload), gak ikut dipake di halaman publik.
const emptyCustomItem = () => ({
  id: `custom-item-${Date.now()}`,
  title: '',
  category: '',
  imageUrl: '',
  description: '',
  wordContent: '',
  wordFileName: '',
  url: '',
  hintEnabled: true,
});

const emptyCustomSection = (label = '') => ({
  id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label,
  // 'gallery' = grid foto (perilaku lama/default, buat poster/dokumentasi visual).
  // 'articles' = tampilan gaya portal berita kayak tab Articles (kartu unggulan besar +
  // daftar kecil), buat tab tambahan yang konteksnya tulisan (esai, cerpen, dll).
  layout: 'gallery',
  items: [],
});

// Jaga-jaga: data projects di Supabase bisa aja masih format lama:
//  - projects.posters: array polos (format paling lama)
//  - projects.gallery: { poster: [...], photo: [...] } (format sebelum ada Sub Bab)
//  - projects.poster.subBabs: array sub bab, tiap sub bab punya items sendiri
//    (format saat Poster masih dikelompokkan per Sub Bab — fitur ini udah dihapus)
// Semua itu dimigrasiin otomatis jadi format baru: projects.poster.items (array
// poster polos, langsung tanpa pengelompokan). Item dari semua sub bab lama
// digabung jadi 1 daftar biar gak ada yang ilang.
// `photo` SENGAJA gak dimigrasiin lagi — fitur Photo udah dihapus dari CMS & halaman publik.
function normalizeProjectsData(raw) {
  const projects = raw || {};
  const articles = Array.isArray(projects.articles) ? projects.articles : [];

  let items;
  if (projects.poster && Array.isArray(projects.poster.items)) {
    // Format terbaru — sudah flat, tinggal pastiin array
    items = projects.poster.items;
  } else if (projects.poster && Array.isArray(projects.poster.subBabs)) {
    // Format lama (per Sub Bab) — gabungin semua item dari tiap sub bab jadi 1 daftar
    items = projects.poster.subBabs.flatMap((sb) => (Array.isArray(sb.items) ? sb.items : []));
  } else {
    // Format lebih lama lagi: gallery.poster atau projects.posters
    items = Array.isArray(projects.gallery?.poster)
      ? projects.gallery.poster
      : Array.isArray(projects.posters)
      ? projects.posters
      : [];
  }

  return {
    heading: projects.heading || '',
    subheading: projects.subheading || '',
    // Label tab navigasi buat Articles & Poster — kosong berarti pakai default
    // ('Articles'/'Poster') di halaman publik.
    articlesLabel: projects.articlesLabel || '',
    posterLabel: projects.posterLabel || '',
    articles,
    poster: { items },
    // Tab tambahan bebas (di luar Articles & Poster) — kalau data lama belum punya
    // field ini sama sekali, defaultnya array kosong (bukan ilang pas disave ulang).
    customSections: Array.isArray(projects.customSections)
      ? projects.customSections.map((s) => ({
          id: s.id || emptyCustomSection().id,
          label: s.label || '',
          layout: s.layout === 'articles' ? 'articles' : 'gallery',
          items: Array.isArray(s.items) ? s.items : [],
        }))
      : [],
  };
}

/* Input & textarea kecil biar gak nulis className berulang-ulang */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded";
const inputClsSm = "w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded";

// Editor teks kaya (rich text) sederhana pakai contentEditable bawaan browser — gak butuh
// library tambahan. Isinya disimpen & di-onChange sebagai string HTML (bukan plain text),
// biar Bold/Italic/Underline/dll yang lo pake di sini kebawa pas ditampilin di halaman publik.
//
// PENTING soal cara kerjanya: initialValue cuma dipasang SEKALI pas komponen ini pertama
// kali muncul (lewat useEffect kosong deps-nya) — SENGAJA gak disinkron ulang tiap kali
// value berubah, karena kalau disinkron ulang tiap ketikan, kursor bakal lompat balik ke
// awal terus (masalah klasik contentEditable yang dikontrol React). Makanya, tiap
// pindah/tambah artikel, pasang prop `key` yang beda (pake id artikelnya) di tempat
// manggil <RichTextEditor> ini, biar React bikin instance baru yang initial value-nya bener.
function RichTextEditor({ initialValue, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command, arg = null) => {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    onChange(ref.current.innerHTML);
  };

  const handleLink = () => {
    const url = window.prompt('Tempel URL link-nya:');
    if (url) exec('createLink', url);
  };

  const ToolbarBtn = ({ onClick, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // biar seleksi teks di editor gak ilang pas klik tombol
      onClick={onClick}
      title={title}
      className="px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-[#1e1e1e] overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2d2d2d] px-1 py-1">
        <ToolbarBtn onClick={() => exec('bold')} title="Bold"><span className="font-bold">B</span></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('italic')} title="Italic"><span className="italic">I</span></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('underline')} title="Underline"><span className="underline">U</span></ToolbarBtn>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Bullet List">• List</ToolbarBtn>
        <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Numbered List">1. List</ToolbarBtn>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <ToolbarBtn onClick={handleLink} title="Insert Link">🔗 Link</ToolbarBtn>
        <ToolbarBtn onClick={() => exec('removeFormat')} title="Clear Formatting">Clear</ToolbarBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="min-h-[140px] px-3 py-2 text-xs leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  );
}

// Upload file gambar dari perangkat/galeri lo ke Supabase Storage, terus balikin
// URL publiknya. Dulu ini nyimpen base64 langsung ke data (bikin data super berat),
// sekarang cuma nyimpen link-nya aja.
async function uploadImageToStorage(file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(fileName, file);

  if (error) {
    console.error('Gagal upload gambar:', error);
    alert('Upload gambar gagal, mang. Cek koneksi internet atau coba lagi.');
    return null;
  }

  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// Convert file .docx (Word) yang di-upload admin jadi HTML, dipakai buat isi cerpen/tulisan
// panjang di Tab Tambahan Projects. Jalan di browser (client-side), gak lewat server —
// mammoth baca ArrayBuffer file-nya langsung terus keluarin HTML (paragraf, bold/italic,
// heading, list dasar ikut kebawa; format kompleks kayak gambar/tabel di dalam docx-nya
// gak didukung mammoth, bakal di-skip). Hasil HTML ini yang DISIMPEN ke data (bukan file
// .docx mentahnya) — jadi pas halaman publik dibuka, tinggal render HTML-nya langsung,
// gak perlu convert ulang tiap kali (lebih cepet & gak butuh mammoth di sisi pengunjung).
async function convertWordFileToHtml(file) {
  if (!file) return null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value; // string HTML
  } catch (err) {
    console.error('Gagal convert file Word:', err);
    alert('Gagal baca file Word ini, mang. Pastiin formatnya .docx (bukan .doc lama) dan coba lagi.');
    return null;
  }
}

export default function CmsDashboard({ data, onSave, onClose }) {
  // Salinan lokal yang bisa diedit bebas — baru dikirim ke portfolioData asli pas Save ditekan.
  const [formData, setFormData] = useState(() => {
    const cloned = JSON.parse(JSON.stringify(data));
    return {
      ...cloned,
      career: normalizeCareerData(cloned.career),
      books: normalizeBooksData(cloned.books),
      projects: normalizeProjectsData(cloned.projects),
      odds: Array.isArray(cloned.odds) ? cloned.odds : [],
      quotes: Array.isArray(cloned.quotes) ? cloned.quotes : [],
      general: normalizeGeneral(cloned.general),
    };
  });
  // null = layar menu utama (pilih salah satu dari 6 tab dulu sebelum masuk ke isinya)
  const [activeTab, setActiveTab] = useState(null);
  // Sub-tab DI DALAM panel "Projects": 'articles' | 'poster' | 'custom'. Dipisah biar
  // admin gak harus scroll ngelewatin Articles+Poster+Tab Tambahan sekaligus dalam 1
  // halaman panjang — cuma 1 section yang di-render/kelihatan dalam satu waktu, mirip
  // nav Articles/Poster di halaman publiknya sendiri.
  const [activeProjectsSubTab, setActiveProjectsSubTab] = useState('articles');
  // Artikel mana yang lagi "dibuka" buat diedit penuh (judul, gambar, isi lengkap, dst).
  // null = semua artikel collapsed (cuma judul + tombol Edit doang). Sengaja dibikin
  // begini biar admin gak usah scroll ngelewatin artikel lain yang isinya panjang cuma
  // buat pindah ke artikel berikutnya — dan biar RichTextEditor (yang lumayan berat)
  // cuma ke-mount 1 biji dalam satu waktu, bukan sekaligus buat semua artikel.
  const [expandedArticleIdx, setExpandedArticleIdx] = useState(null);
  // Item Career mana (di kategori mana) yang lagi "dibuka" buat diedit penuh — sama
  // konsepnya kayak expandedArticleIdx di atas, tapi keynya gabungan "catIdx-idx" karena
  // Career punya banyak kategori sekaligus (bukan 1 daftar rata kayak Articles). null =
  // semua item collapsed (cuma judul singkat + tombol Edit), biar kategori yang isinya
  // banyak item gak bikin CMS numpuk panjang ke bawah.
  const [expandedCareerKey, setExpandedCareerKey] = useState(null);
  // Kategori Career mana yang lagi ditampilin (id kategori) — sama konsepnya kayak
  // activeProjectsSubTab: cuma 1 kategori yang keliatan isinya dalam satu waktu, sisanya
  // disembunyiin di balik pill tab. null = fallback ke kategori pertama (lihat currentCareerCatIdx
  // di render). Direset ke null kalau kategori yang lagi aktif dihapus.
  const [activeCareerCategory, setActiveCareerCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingPhotoDark, setIsUploadingPhotoDark] = useState(false);
  // Nyimpen kategori career mana yang lagi proses upload bgImage-nya (biar spinner-nya per-kategori)
  const [uploadingCareerBg, setUploadingCareerBg] = useState(null);
  // Kunci berupa "kategori-idx" buat nandain item mana yang lagi upload foto instansinya
  const [uploadingCompanyPhoto, setUploadingCompanyPhoto] = useState(null);
  // Index buku yang lagi proses upload cover-nya
  const [uploadingBookCover, setUploadingBookCover] = useState(null);
  // Index buku yang lagi proses upload foto overview-nya (halaman kiri pas dibuka)
  const [uploadingBookOverview, setUploadingBookOverview] = useState(null);
  // Index artikel yang lagi proses upload gambarnya
  const [uploadingArticleImage, setUploadingArticleImage] = useState(null);
  // Index tombol aksi (di tab Contact) yang lagi proses upload file-nya (mis. PDF resume)
  const [uploadingActionButton, setUploadingActionButton] = useState(null);
  // Kunci berupa "poster-{itemIdx}" buat nandain item poster mana yang lagi upload
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(null);
  // Kunci berupa "{sectionIdx}-{itemIdx}" buat nandain item di tab tambahan (custom section)
  // mana yang lagi proses upload gambarnya
  const [uploadingCustomImage, setUploadingCustomImage] = useState(null);
  // Sama kayak uploadingCustomImage di atas (key: "sectionIdx-itemIdx"), tapi buat proses
  // convert file .docx → HTML yang lagi jalan di item mana.
  const [convertingCustomWord, setConvertingCustomWord] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
    if (success === false) {
      alert('Gagal simpan perubahan. Cek koneksi internet lo dan coba lagi.');
      return;
    }
    // Berhasil disimpan — balik ke menu pilih tab, TETEP di dalem admin mode.
    // Keluar dari admin mode sepenuhnya cuma lewat tombol "Exit Admin" di TitleBar.
    setActiveTab(null);
  };

  const handleCancel = () => {
    if (window.confirm('Batalin semua perubahan yang belum disimpan?')) {
      // Buang perubahan yang belum disimpan, balik ke data asli — tapi tetep di admin mode,
      // cuma balik ke menu pilih tab. Bukan onClose(), biar gak langsung ke-logout.
      const cloned = JSON.parse(JSON.stringify(data));
      setFormData({
        ...cloned,
        career: normalizeCareerData(cloned.career),
        books: normalizeBooksData(cloned.books),
        projects: normalizeProjectsData(cloned.projects),
        odds: Array.isArray(cloned.odds) ? cloned.odds : [],
        quotes: Array.isArray(cloned.quotes) ? cloned.quotes : [],
        general: normalizeGeneral(cloned.general),
      });
      setActiveTab(null);
    }
  };

  /* ============ HOME ============ */
  const setHome = (field, value) =>
    setFormData((p) => ({ ...p, home: { ...p.home, [field]: value } }));

  /* ============ ODDS ============ */
  // Textarea satu baris = satu serpihan teks. Baris kosong disaring pas dipakai di
  // halaman publik (App.jsx), jadi gapapa kalau sementara ngetik ada baris kosong nyempil.
  const setOdds = (rawText) =>
    setFormData((p) => ({ ...p, odds: rawText.split('\n') }));

  /* ============ QUOTES ============ */
  // Sama pola-nya kayak Odds (satu baris = satu kutipan), tapi field-nya kepisah total —
  // biar nambah kutipan buat balon komentar gak ikut nambahin serpihan watermark, begitu juga sebaliknya.
  const setQuotes = (rawText) =>
    setFormData((p) => ({ ...p, quotes: rawText.split('\n') }));

  /* ============ GENERAL ============ */
  // Semua pengaturan di sini sifatnya site-wide (bukan punya satu halaman doang),
  // makanya field-nya dikelompokkan lewat 1 setter yang nerima nested key.
  const setWelcomeNotification = (field, value) =>
    setFormData((p) => ({
      ...p,
      general: {
        ...p.general,
        welcomeNotification: { ...p.general.welcomeNotification, [field]: value },
      },
    }));

  /* ============ ABOUT ============ */
  // Live, Life, Laugh sekarang masing-masing cuma satu kotak teks paragraf bebas.
  const setAboutField = (field, value) =>
    setFormData((p) => ({ ...p, about: { ...p.about, [field]: value } }));

  /* ============ CAREER ============ */
  // Judul & sub-judul di layar menu utama halaman Career
  const setCareerHeading = (field, value) =>
    setFormData((p) => ({ ...p, career: { ...p.career, [field]: value } }));

  // Helper: update 1 kategori di dalam array career.categories berdasarkan index-nya
  const updateCareerCategory = (catIdx, updater) =>
    setFormData((p) => {
      const categories = [...p.career.categories];
      categories[catIdx] = updater(categories[catIdx]);
      return { ...p, career: { ...p.career, categories } };
    });

  // Nambah kategori baru (kosong) — tipe dipilih pas nambah, bisa diganti lagi belakangan
  const addCareerCategory = (type = 'career') => {
    const newCat = emptyCareerCategory(type);
    setActiveCareerCategory(newCat.id);
    setFormData((p) => ({
      ...p,
      career: { ...p.career, categories: [...p.career.categories, newCat] },
    }));
  };

  const removeCareerCategory = (catIdx) => {
    const removedId = formData.career.categories[catIdx]?.id;
    setActiveCareerCategory((cur) => (cur === removedId ? null : cur));
    setFormData((p) => ({
      ...p,
      career: { ...p.career, categories: p.career.categories.filter((_, i) => i !== catIdx) },
    }));
  };

  // Nama kategori yang tampil di kartu menu (bebas diganti, mis. "Professional" -> "Kerja")
  const setCareerCategoryName = (catIdx, value) =>
    updateCareerCategory(catIdx, (cat) => ({ ...cat, name: value }));

  // Tipe kartu kategori: 'career' (Posisi @ Instansi) atau 'credential' (Pencapaian/Sertifikat).
  // Ganti tipe TIDAK ngubah item yang udah ada (field yang gak relevan cuma gak dipakai di
  // tampilan publik) — biar aman kalau kepencet gak sengaja, tapi sebaiknya diisi ulang.
  const setCareerCategoryType = (catIdx, value) =>
    updateCareerCategory(catIdx, (cat) => ({ ...cat, type: value }));

  // Ganti gambar latar kartu menu kategori di halaman publik
  const setCareerBgImage = (catIdx, value) =>
    updateCareerCategory(catIdx, (cat) => ({ ...cat, bgImage: value }));

  const setCareerItemField = (catIdx, idx, field, value) =>
    updateCareerCategory(catIdx, (cat) => {
      const items = [...cat.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...cat, items };
    });

  const setCareerCompanyInfoField = (catIdx, idx, field, value) =>
    updateCareerCategory(catIdx, (cat) => {
      const items = [...cat.items];
      items[idx] = {
        ...items[idx],
        companyInfo: { ...items[idx].companyInfo, [field]: value },
      };
      return { ...cat, items };
    });

  const addCareerItem = (catIdx) => {
    const newIdx = formData.career.categories[catIdx]?.items.length ?? 0;
    setExpandedCareerKey(`${catIdx}-${newIdx}`);
    updateCareerCategory(catIdx, (cat) => ({
      ...cat,
      items: [...cat.items, cat.type === 'credential' ? emptyCredentialItem() : emptyCareerItem()],
    }));
  };

  const removeCareerItem = (catIdx, idx) => {
    setExpandedCareerKey((cur) => (cur === `${catIdx}-${idx}` ? null : cur));
    updateCareerCategory(catIdx, (cat) => ({
      ...cat,
      items: cat.items.filter((_, i) => i !== idx),
    }));
  };

  /* ============ BOOKS ============ */
  // Judul & sub-judul di halaman Book (di atas rak buku)
  const setBooksHeading = (field, value) =>
    setFormData((p) => ({ ...p, books: { ...p.books, [field]: value } }));

  const setBookField = (idx, field, value) =>
    setFormData((p) => {
      const items = [...p.books.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...p, books: { ...p.books, items } };
    });

  const addBook = () =>
    setFormData((p) => ({ ...p, books: { ...p.books, items: [...p.books.items, emptyBook()] } }));
  const removeBook = (idx) =>
    setFormData((p) => ({ ...p, books: { ...p.books, items: p.books.items.filter((_, i) => i !== idx) } }));

  /* ============ PROJECTS: ARTICLES & GALLERY (Poster/Photo) ============ */
  const setProjectsField = (field, value) =>
    setFormData((p) => ({ ...p, projects: { ...p.projects, [field]: value } }));

  const setArticleField = (idx, field, value) =>
    setFormData((p) => {
      const articles = [...p.projects.articles];
      articles[idx] = { ...articles[idx], [field]: value };
      return { ...p, projects: { ...p.projects, articles } };
    });
  const addArticle = () => {
    setExpandedArticleIdx(formData.projects.articles.length);
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, articles: [...p.projects.articles, emptyArticle()] },
    }));
  };
  const removeArticle = (idx) => {
    setExpandedArticleIdx((cur) => (cur === idx ? null : cur));
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, articles: p.projects.articles.filter((_, i) => i !== idx) },
    }));
  };

  /* ============ PROJECTS: POSTER (daftar file langsung, tanpa Sub Bab) ============ */
  const setPosterItemField = (itemIdx, field, value) =>
    setFormData((p) => {
      const items = [...p.projects.poster.items];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      return { ...p, projects: { ...p.projects, poster: { items } } };
    });
  const addPosterItem = () =>
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, poster: { items: [...p.projects.poster.items, emptyPosterItem()] } },
    }));
  const removePosterItem = (itemIdx) =>
    setFormData((p) => ({
      ...p,
      projects: {
        ...p.projects,
        poster: { items: p.projects.poster.items.filter((_, i) => i !== itemIdx) },
      },
    }));

  /* ============ PROJECTS: TAB TAMBAHAN (CUSTOM SECTIONS) ============ */
  // Nama tab-nya sendiri bebas ditentuin (mis. "Dummy Projects", "Eksperimen", dll).
  // Tiap custom section dapet pill nav sendiri (sejajar Articles/Poster) — begitu
  // ditambah, langsung pindah ke pill barunya biar bisa langsung diedit namanya,
  // gak numpuk collapsed di dalam 1 wrapper tab generik lagi.
  const addCustomSection = () => {
    const newSection = emptyCustomSection();
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, customSections: [...p.projects.customSections, newSection] },
    }));
    setActiveProjectsSubTab(`custom:${newSection.id}`);
  };
  const removeCustomSection = (sectionIdx) => {
    const removedId = formData.projects.customSections[sectionIdx]?.id;
    if (removedId && activeProjectsSubTab === `custom:${removedId}`) {
      setActiveProjectsSubTab('articles');
    }
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, customSections: p.projects.customSections.filter((_, i) => i !== sectionIdx) },
    }));
  };
  const setCustomSectionLabel = (sectionIdx, label) =>
    setFormData((p) => {
      const customSections = [...p.projects.customSections];
      customSections[sectionIdx] = { ...customSections[sectionIdx], label };
      return { ...p, projects: { ...p.projects, customSections } };
    });
  const setCustomSectionLayout = (sectionIdx, layout) =>
    setFormData((p) => {
      const customSections = [...p.projects.customSections];
      customSections[sectionIdx] = { ...customSections[sectionIdx], layout };
      return { ...p, projects: { ...p.projects, customSections } };
    });
  const setCustomItemField = (sectionIdx, itemIdx, field, value) =>
    setFormData((p) => {
      const customSections = [...p.projects.customSections];
      const items = [...customSections[sectionIdx].items];
      items[itemIdx] = { ...items[itemIdx], [field]: value };
      customSections[sectionIdx] = { ...customSections[sectionIdx], items };
      return { ...p, projects: { ...p.projects, customSections } };
    });
  const addCustomItem = (sectionIdx) =>
    setFormData((p) => {
      const customSections = [...p.projects.customSections];
      customSections[sectionIdx] = {
        ...customSections[sectionIdx],
        items: [...customSections[sectionIdx].items, emptyCustomItem()],
      };
      return { ...p, projects: { ...p.projects, customSections } };
    });
  const removeCustomItem = (sectionIdx, itemIdx) =>
    setFormData((p) => {
      const customSections = [...p.projects.customSections];
      customSections[sectionIdx] = {
        ...customSections[sectionIdx],
        items: customSections[sectionIdx].items.filter((_, i) => i !== itemIdx),
      };
      return { ...p, projects: { ...p.projects, customSections } };
    });

  /* ============ CONTACT ============ */
  const setContactField = (field, value) =>
    setFormData((p) => ({ ...p, contact: { ...p.contact, [field]: value } }));

  const setSocialField = (idx, field, value) =>
    setFormData((p) => {
      const socials = [...p.contact.socials];
      socials[idx] = { ...socials[idx], [field]: value };
      return { ...p, contact: { ...p.contact, socials } };
    });
  const addSocial = () =>
    setFormData((p) => ({
      ...p,
      contact: { ...p.contact, socials: [...p.contact.socials, { name: '', url: '', label: '' }] },
    }));
  const removeSocial = (idx) =>
    setFormData((p) => ({
      ...p,
      contact: { ...p.contact, socials: p.contact.socials.filter((_, i) => i !== idx) },
    }));

  const setActionButtonField = (idx, field, value) =>
    setFormData((p) => {
      const buttons = [...p.contact.actionButtons];
      buttons[idx] = { ...buttons[idx], [field]: value };
      return { ...p, contact: { ...p.contact, actionButtons: buttons } };
    });
  const addActionButton = () =>
    setFormData((p) => ({
      ...p,
      contact: {
        ...p.contact,
        actionButtons: [...p.contact.actionButtons, { label: '', url: '', primary: false, body: '' }],
      },
    }));
  const removeActionButton = (idx) =>
    setFormData((p) => ({
      ...p,
      contact: { ...p.contact, actionButtons: p.contact.actionButtons.filter((_, i) => i !== idx) },
    }));

  /* ============ REORDER (Articles & Poster items) ============ */
  // listKey: 'articles' ATAU 'poster' — nyimpen daftar mana yang lagi diurutin
  const dragInfo = useRef({ listKey: null, index: null });
  const [draggingKey, setDraggingKey] = useState(null);

  const reorderList = (listKey, fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (listKey === 'articles') {
      setFormData((p) => {
        if (toIdx >= p.projects.articles.length) return p;
        const articles = [...p.projects.articles];
        const [moved] = articles.splice(fromIdx, 1);
        articles.splice(toIdx, 0, moved);
        return { ...p, projects: { ...p.projects, articles } };
      });
    } else if (listKey === 'poster') {
      setFormData((p) => {
        const items = p.projects.poster.items;
        if (toIdx >= items.length) return p;
        const newItems = [...items];
        const [moved] = newItems.splice(fromIdx, 1);
        newItems.splice(toIdx, 0, moved);
        return { ...p, projects: { ...p.projects, poster: { items: newItems } } };
      });
    } else if (listKey.startsWith('career:')) {
      // listKey = "career:<catIdx>" — urutin item DI DALAM kategori itu doang.
      const catIdx = Number(listKey.slice('career:'.length));
      setFormData((p) => {
        const categories = [...p.career.categories];
        const items = categories[catIdx]?.items;
        if (!items || toIdx >= items.length) return p;
        const newItems = [...items];
        const [moved] = newItems.splice(fromIdx, 1);
        newItems.splice(toIdx, 0, moved);
        categories[catIdx] = { ...categories[catIdx], items: newItems };
        return { ...p, career: { ...p.career, categories } };
      });
    }
  };

  const handleDragStart = (listKey, idx) => (e) => {
    dragInfo.current = { listKey, index: idx };
    setDraggingKey(`${listKey}-${idx}`);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (listKey, idx) => (e) => {
    e.preventDefault();
    const from = dragInfo.current;
    if (!from || from.listKey !== listKey || from.index === null) return;
    reorderList(listKey, from.index, idx);
    dragInfo.current = { listKey: null, index: null };
    setDraggingKey(null);
  };
  const handleDragEnd = () => {
    dragInfo.current = { listKey: null, index: null };
    setDraggingKey(null);
  };

  // Handle seret (drag) + tombol naik/turun — dua-duanya sama-sama manggil reorderList,
  // jadi bebas dipakai drag di desktop atau tap tombol di HP/touchscreen
  const ReorderHandle = ({ listKey, idx, count }) => (
    <div className="flex items-center gap-0.5 shrink-0">
      <span
        draggable
        onDragStart={handleDragStart(listKey, idx)}
        onDragEnd={handleDragEnd}
        title="Seret buat urutin"
        className="cursor-grab active:cursor-grabbing select-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1 text-sm leading-none"
      >
        ⠿
      </span>
      <button
        type="button"
        onClick={() => reorderList(listKey, idx, idx - 1)}
        disabled={idx === 0}
        title="Naikkan urutan"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none px-1 py-0.5"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => reorderList(listKey, idx, idx + 1)}
        disabled={idx === count - 1}
        title="Turunkan urutan"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none px-1 py-0.5"
      >
        ▼
      </button>
    </div>
  );

  const RemoveBtn = ({ onClick, label = 'Hapus' }) => (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] text-red-500 hover:text-red-600 font-semibold"
    >
      {label}
    </button>
  );
  const AddBtn = ({ onClick, label }) => (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40"
    >
      + {label}
    </button>
  );

  // Blok form 1 item Poster — file langsung tanpa Sub Bab, tinggal "Tambah Poster"
  // dan item baru langsung nongol di daftar (bisa diurutin/dihapus).
  const renderPosterItem = (it, idx, items) => {
    const listKey = 'poster';
    return (
      <div
        key={it.id || idx}
        onDragOver={handleDragOver}
        onDrop={handleDrop(listKey, idx)}
        className={`p-3 bg-white dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 space-y-2 transition-opacity ${
          draggingKey === `${listKey}-${idx}` ? 'opacity-40' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ReorderHandle listKey={listKey} idx={idx} count={items.length} />
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Poster #{idx + 1}
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={it.hintEnabled !== false}
                onChange={(e) => setPosterItemField(idx, 'hintEnabled', e.target.checked)}
                className="accent-blue-600"
              />
              Blink pas mode Hint
            </label>
            <RemoveBtn onClick={() => removePosterItem(idx)} />
          </div>
        </div>
        <input type="text" value={it.title} onChange={(e) => setPosterItemField(idx, 'title', e.target.value)} placeholder="Judul" className={inputClsSm} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input type="text" value={it.category} onChange={(e) => setPosterItemField(idx, 'category', e.target.value)} placeholder="Kategori" className={inputClsSm} />
          <input type="text" value={it.dimensions} onChange={(e) => setPosterItemField(idx, 'dimensions', e.target.value)} placeholder="Dimensi/Info (mis. 2400x3000px)" className={inputClsSm} />
        </div>

        <div className="flex items-center gap-2">
          {it.imageUrl && (
            <img src={it.imageUrl} alt={it.title} className="w-14 h-14 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={uploadingGalleryImage === `${listKey}-${idx}`}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              setUploadingGalleryImage(`${listKey}-${idx}`);
              const url = await uploadImageToStorage(file);
              setUploadingGalleryImage(null);
              if (url) setPosterItemField(idx, 'imageUrl', url);
              e.target.value = '';
            }}
            className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
          />
        </div>
        <input type="text" value={it.imageUrl} onChange={(e) => setPosterItemField(idx, 'imageUrl', e.target.value)} placeholder="Atau tempel URL Gambar (dari galeri/hosting lain)" className={inputClsSm} />

        <textarea rows={2} value={it.description} onChange={(e) => setPosterItemField(idx, 'description', e.target.value)} placeholder="Deskripsi singkat (penjelasan karya)" className={`${inputClsSm} resize-none`} />
      </div>
    );
  };

  // Blok form 1 Tab Tambahan (Custom Section) — label tab (bisa diedit/dihapus) + daftar
  // kartu sederhana di dalamnya (judul, kategori, gambar, deskripsi, link opsional).
  // Sama kayak renderPosterItem: fungsi biasa yang nge-return JSX, BUKAN komponen
  // JSX tag, biar input gak kehilangan fokus tiap ngetik (lihat catatan di
  // renderPosterItem soal kenapa ini penting).
  //
  // Beda dari renderPosterItem: gak ada collapse/expand di sini, soalnya
  // masing-masing custom section UDAH dapet pill nav sendiri di atas (sejajar
  // Articles/Poster) — jadi "buka" section ini ya klik pill-nya langsung, gak perlu
  // tombol Edit/Tutup terpisah lagi kayak dulu waktu semua numpuk di 1 wrapper tab.
  const renderCustomSectionBlock = (section, sectionIdx) => {
    const items = section.items;
    return (
      <div key={section.id || sectionIdx} className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={section.label}
            onChange={(e) => setCustomSectionLabel(sectionIdx, e.target.value)}
            placeholder="Nama Tab (mis. Dummy Projects, Eksperimen, dst) — ini yang tampil di pill nav"
            className={`${inputClsSm} font-semibold flex-1`}
          />
          <RemoveBtn onClick={() => removeCustomSection(sectionIdx)} label="Hapus Tab Ini" />
        </div>

        {/* Pilihan tampilan MENU tab ini pas dibuka visitor — 'gallery' (grid foto, cocok
            buat poster/dokumentasi visual) atau 'articles' (kartu unggulan besar + daftar
            kecil gaya portal berita, SAMA PERSIS kayak tab Articles bawaan — cocok buat
            tab yang isinya tulisan/esai/cerpen). */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">Tampilan Menu:</span>
          {[
            { key: 'gallery', label: 'Galeri (grid foto)' },
            { key: 'articles', label: 'Tulisan (seperti Articles)' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCustomSectionLayout(sectionIdx, opt.key)}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                (section.layout || 'gallery') === opt.key
                  ? 'bg-[#2B579A] dark:bg-[#6FA8DC] text-white dark:text-[#1a1a1a] border-[#2B579A] dark:border-[#6FA8DC] font-semibold'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Item ({items.length})
            </h4>
            <AddBtn onClick={() => addCustomItem(sectionIdx)} label="Tambah Item" />
          </div>

          {items.length === 0 && (
            <p className="text-[10px] text-gray-400 italic">Belum ada item.</p>
          )}

          {items.map((it, idx) => (
            <div
              key={it.id || idx}
              className="p-3 bg-white dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Item #{idx + 1}</h4>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={it.hintEnabled !== false}
                      onChange={(e) => setCustomItemField(sectionIdx, idx, 'hintEnabled', e.target.checked)}
                      className="accent-blue-600"
                    />
                    Blink pas mode Hint
                  </label>
                  <RemoveBtn onClick={() => removeCustomItem(sectionIdx, idx)} />
                </div>
              </div>
              <input type="text" value={it.title} onChange={(e) => setCustomItemField(sectionIdx, idx, 'title', e.target.value)} placeholder="Judul" className={inputClsSm} />
              <input type="text" value={it.category} onChange={(e) => setCustomItemField(sectionIdx, idx, 'category', e.target.value)} placeholder="Kategori (opsional)" className={inputClsSm} />

              <div className="flex items-center gap-2">
                {it.imageUrl && (
                  <img src={it.imageUrl} alt={it.title} className="w-14 h-14 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingCustomImage === `${sectionIdx}-${idx}`}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploadingCustomImage(`${sectionIdx}-${idx}`);
                    const url = await uploadImageToStorage(file);
                    setUploadingCustomImage(null);
                    if (url) setCustomItemField(sectionIdx, idx, 'imageUrl', url);
                    e.target.value = '';
                  }}
                  className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                />
              </div>
              <input type="text" value={it.imageUrl} onChange={(e) => setCustomItemField(sectionIdx, idx, 'imageUrl', e.target.value)} placeholder="Atau tempel URL Gambar" className={inputClsSm} />

              <textarea rows={2} value={it.description} onChange={(e) => setCustomItemField(sectionIdx, idx, 'description', e.target.value)} placeholder="Deskripsi singkat" className={`${inputClsSm} resize-none`} />

              {/* Upload cerpen/tulisan panjang dari file Word (.docx) — isinya diconvert
                  jadi HTML sekali di sini, terus ditampilin sebagai teks penuh di halaman
                  publik (gantiin Deskripsi singkat di atas kalau field ini keisi), TANPA
                  nawarin download file .docx-nya. Kalau mau ganti isinya, tinggal upload
                  file baru lagi (nimpa yang lama) atau pencet "Hapus Isi Tulisan". */}
              <div className="space-y-1.5 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block pt-1.5">
                  Isi Tulisan Panjang (opsional, dari file Word)
                </label>
                <input
                  type="file"
                  accept=".docx"
                  disabled={convertingCustomWord === `${sectionIdx}-${idx}`}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setConvertingCustomWord(`${sectionIdx}-${idx}`);
                    const html = await convertWordFileToHtml(file);
                    setConvertingCustomWord(null);
                    if (html != null) {
                      setCustomItemField(sectionIdx, idx, 'wordContent', html);
                      setCustomItemField(sectionIdx, idx, 'wordFileName', file.name);
                    }
                    e.target.value = '';
                  }}
                  className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                />
                {convertingCustomWord === `${sectionIdx}-${idx}` && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Lagi ngonversi file Word...</p>
                )}
                {it.wordContent && convertingCustomWord !== `${sectionIdx}-${idx}` && (
                  <div className="flex items-center justify-between gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded px-2 py-1.5">
                    <span className="text-[10px] text-green-700 dark:text-green-400 truncate">
                      ✓ {it.wordFileName || 'File Word'} sudah dikonversi & bakal tampil di halaman publik
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomItemField(sectionIdx, idx, 'wordContent', '');
                        setCustomItemField(sectionIdx, idx, 'wordFileName', '');
                      }}
                      className="shrink-0 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline"
                    >
                      Hapus Isi Tulisan
                    </button>
                  </div>
                )}
              </div>

              <input type="text" value={it.url} onChange={(e) => setCustomItemField(sectionIdx, idx, 'url', e.target.value)} placeholder="Link tombol 'Lihat' (opsional)" className={inputClsSm} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-gray-900 dark:text-gray-100 p-4">

      {/* HEADER & TOMBOL GLOBAL SAVE / NOPE */}
      <div className="border-b pb-4 border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono">PANEL KONTROL CMS ADMIN</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Edit isi ke-6 tab website lo dari sini — perubahan langsung kepakai di halaman publik begitu Save ditekan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-semibold rounded transition-colors"
          >
            Nope / Cancel
          </button>
          <button
            type="submit"
            form="cms-admin-form"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded shadow transition-colors"
          >
            {isSaving ? 'Menyimpan...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <form id="cms-admin-form" onSubmit={handleSave} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm space-y-6">

      {activeTab === null ? (
        /* ================= LAYAR MENU UTAMA: PILIH TAB ================= */
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            Pilih bagian yang mau diedit
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TABS.map((tab) => {
              const meta = TAB_META[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="flex flex-col items-start gap-1.5 p-4 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <span className="text-2xl leading-none">{meta.emoji}</span>
                  <span className="text-sm font-bold font-mono uppercase tracking-wide text-gray-800 dark:text-gray-100">
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
                    {meta.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
      <>
        {/* Tombol kembali ke menu — pola sama kayak halaman publik Career.jsx */}
        <button
          type="button"
          onClick={() => setActiveTab(null)}
          className="flex items-center gap-1.5 text-xs font-mono text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-2 transition-colors"
        >
          <span>←</span> Kembali ke Menu
        </button>

        {/* ================= HOME ================= */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Home</h2>
            <Field label="Nama Lengkap">
              <input type="text" value={formData.home.name} onChange={(e) => setHome('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Role / Jabatan Singkat">
              <input type="text" value={formData.home.role} onChange={(e) => setHome('role', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Bio Singkat">
              <textarea rows={3} value={formData.home.bio} onChange={(e) => setHome('bio', e.target.value)} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="URL Foto Profil (tempel link gambar)">
              <input type="text" value={formData.home.photoUrl} onChange={(e) => setHome('photoUrl', e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
            <Field label="Atau Upload Foto dari Galeri/Perangkat Lo">
              <div className="flex items-center gap-3">
                {formData.home.photoUrl && (
                  <img src={formData.home.photoUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhoto}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setIsUploadingPhoto(true);
                    const url = await uploadImageToStorage(file);
                    setIsUploadingPhoto(false);
                    if (url) setHome('photoUrl', url);
                    e.target.value = ''; // biar bisa pilih file yang sama lagi kalau perlu
                  }}
                  className="flex-1 text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                />
                {formData.home.photoUrl && (
                  <button type="button" onClick={() => setHome('photoUrl', '')} className="text-[10px] text-red-500 hover:text-red-600 font-semibold shrink-0">
                    Hapus
                  </button>
                )}
              </div>
              {isUploadingPhoto && (
                <p className="text-[10px] text-blue-500 mt-1 animate-pulse">Mengupload foto...</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">Upload dari galeri bakal nimpa link URL di atas (dan sebaliknya) — pakai salah satu aja.</p>
            </Field>

            <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-100 dark:border-gray-800">
              Foto di atas cuma dipakai pas web-nya Light Mode. Isi juga foto khusus buat Dark Mode di bawah ini (biasanya versi background gelap / warna asli) — kalau dikosongin, foto Light Mode di atas bakal dipakai buat dua-duanya.
            </p>

            <Field label="URL Foto Profil untuk Dark Mode (tempel link gambar)">
              <input type="text" value={formData.home.photoUrlDark} onChange={(e) => setHome('photoUrlDark', e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
            <Field label="Atau Upload Foto Dark Mode dari Galeri/Perangkat Lo">
              <div className="flex items-center gap-3">
                {formData.home.photoUrlDark && (
                  <img src={formData.home.photoUrlDark} alt="Preview Dark Mode" className="w-14 h-14 rounded-lg object-cover border border-gray-300 dark:border-gray-600 shrink-0 bg-[#202020]" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhotoDark}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setIsUploadingPhotoDark(true);
                    const url = await uploadImageToStorage(file);
                    setIsUploadingPhotoDark(false);
                    if (url) setHome('photoUrlDark', url);
                    e.target.value = ''; // biar bisa pilih file yang sama lagi kalau perlu
                  }}
                  className="flex-1 text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                />
                {formData.home.photoUrlDark && (
                  <button type="button" onClick={() => setHome('photoUrlDark', '')} className="text-[10px] text-red-500 hover:text-red-600 font-semibold shrink-0">
                    Hapus
                  </button>
                )}
              </div>
              {isUploadingPhotoDark && (
                <p className="text-[10px] text-blue-500 mt-1 animate-pulse">Mengupload foto...</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">Upload dari galeri bakal nimpa link URL di atas (dan sebaliknya) — pakai salah satu aja.</p>
            </Field>
          </div>
        )}

        {/* ================= ABOUT ================= */}
        {activeTab === 'about' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab About</h2>
            <p className="text-xs text-gray-500 italic">Tiap kotak di bawah tampil sebagai satu section accordion terpisah (Live, Life, Laugh) di halaman publik. Tulis bebas dalam bentuk paragraf.</p>

            <Field label="Live">
              <textarea rows={5} value={formData.about.live} onChange={(e) => setAboutField('live', e.target.value)} placeholder="Ceritain soal keseharian & profesional lo di sini..." className={`${inputCls} resize-none`} />
            </Field>

            <Field label="Life">
              <textarea rows={5} value={formData.about.life} onChange={(e) => setAboutField('life', e.target.value)} placeholder="Ceritain soal hal-hal di luar kerjaan yang lo nikmatin..." className={`${inputCls} resize-none`} />
            </Field>

            <Field label="Laugh">
              <textarea rows={5} value={formData.about.laugh} onChange={(e) => setAboutField('laugh', e.target.value)} placeholder="Ceritain sisi santai/lucu dari diri lo..." className={`${inputCls} resize-none`} />
            </Field>
          </div>
        )}

        {/* ================= CAREER ================= */}
        {activeTab === 'career' && (
          <div className="space-y-6">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Career</h2>
            <p className="text-xs text-gray-500 italic">
              Kategori di bawah bebas ditambah, dihapus, atau diganti namanya — cocok buat
              riwayat kerja/pendidikan, tapi juga bisa dipakai buat Achievements, Certificates,
              atau slot lain yang lo butuhin.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Judul Halaman (mis. Career & Education)">
                <input type="text" value={formData.career.heading} onChange={(e) => setCareerHeading('heading', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sub-judul / Keterangan Singkat">
                <input type="text" value={formData.career.subheading} onChange={(e) => setCareerHeading('subheading', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {formData.career.categories.length === 0 && (
              <p className="text-[11px] text-gray-400 italic">Belum ada kategori. Tambah salah satu tipe di bawah buat mulai.</p>
            )}

            {/* Pola tab pill: cuma 1 kategori yang keliatan isinya dalam satu waktu (Professional
                ATAU College ATAU dst), sisanya ngumpet di balik pill-nya — sama kayak sub-tab
                Articles/Poster di tab Projects. Ini yang bikin CMS gak numpuk-panjang kalau
                kategorinya banyak. */}
            {formData.career.categories.length > 0 && (() => {
              const foundIdx = formData.career.categories.findIndex((c) => c.id === activeCareerCategory);
              const catIdx = foundIdx === -1 ? 0 : foundIdx;
              const category = formData.career.categories[catIdx];
              const bgKey = category.id || catIdx;
              const isCredential = category.type === 'credential';
              const listKey = `career:${catIdx}`;

              return (
                <>
                  <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 flex-wrap items-center">
                    {formData.career.categories.map((cat, idx) => (
                      <button
                        key={cat.id || idx}
                        type="button"
                        onClick={() => setActiveCareerCategory(cat.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                          catIdx === idx
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#383838]'
                        }`}
                      >
                        {cat.name || `Kategori #${idx + 1}`} ({cat.items.length})
                      </button>
                    ))}
                  </div>

                  <div key={category.id || catIdx} className="space-y-3 p-4 rounded-lg border-2 border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => setCareerCategoryName(catIdx, e.target.value)}
                        placeholder="Nama Kategori (mis. Professional, Achievements, dst)"
                        className={`${inputClsSm} font-semibold flex-1`}
                      />
                      <select
                        value={category.type}
                        onChange={(e) => setCareerCategoryType(catIdx, e.target.value)}
                        className={`${inputClsSm} sm:w-56 shrink-0`}
                      >
                        <option value="career">{CAREER_TYPE_LABEL.career}</option>
                        <option value="credential">{CAREER_TYPE_LABEL.credential}</option>
                      </select>
                      <RemoveBtn onClick={() => removeCareerCategory(catIdx)} label="Hapus Kategori" />
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {category.items.length} item — seret ⠿ atau pakai ▲▼ buat urutin
                      </h3>
                      <AddBtn onClick={() => addCareerItem(catIdx)} label="Tambah Item" />
                    </div>

                    {/* Gambar latar kartu menu kategori ini di halaman publik */}
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded border border-dashed border-blue-200 dark:border-blue-900 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                        Gambar Latar Kartu Menu "{category.name || 'Tanpa Nama'}"
                      </span>
                      <div className="flex items-center gap-3">
                        {category.bgImage && (
                          <img src={category.bgImage} alt={category.name} className="w-16 h-12 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingCareerBg === bgKey}
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setUploadingCareerBg(bgKey);
                            const url = await uploadImageToStorage(file);
                            setUploadingCareerBg(null);
                            if (url) setCareerBgImage(catIdx, url);
                            e.target.value = '';
                          }}
                          className="flex-1 text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                        />
                        {category.bgImage && (
                          <button type="button" onClick={() => setCareerBgImage(catIdx, '')} className="text-[10px] text-red-500 hover:text-red-600 font-semibold shrink-0">
                            Hapus
                          </button>
                        )}
                      </div>
                      {uploadingCareerBg === bgKey && (
                        <p className="text-[10px] text-blue-500 animate-pulse">Mengupload gambar...</p>
                      )}
                      <input
                        type="text"
                        value={category.bgImage}
                        onChange={(e) => setCareerBgImage(catIdx, e.target.value)}
                        placeholder="Atau tempel URL gambar langsung di sini"
                        className={inputClsSm}
                      />
                      <p className="text-[10px] text-gray-400">Kosongkan aja kalau belum ada — nanti otomatis pakai warna gradasi default.</p>
                    </div>

                    {category.items.length === 0 && (
                      <p className="text-[11px] text-gray-400 italic">Belum ada item.</p>
                    )}

                    {/* -------- Item TIPE 'career': Posisi @ Instansi + pop-up detail instansi -------- */}
                    {/* Collapsed by default (cuma judul + tombol Edit) — sama pola kayak Articles di
                        tab Projects, biar kategori yang isinya banyak item (Professional, College, dst)
                        gak numpuk-panjang sekaligus di layar. Klik "Edit" buat buka form lengkapnya.
                        ReorderHandle (⠿ / ▲ / ▼) dipasang di kedua mode (collapsed & expanded) buat
                        geser urutan item — misal item yang baru diupdate mau ditaruh paling atas. */}
                    {!isCredential && category.items.map((item, idx) => {
                      const itemKey = `${catIdx}-${idx}`;
                      const isOpen = expandedCareerKey === itemKey;

                      if (!isOpen) {
                        return (
                          <div
                            key={item.id || idx}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop(listKey, idx)}
                            className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 transition-opacity ${
                              draggingKey === `${listKey}-${idx}` ? 'opacity-40' : ''
                            }`}
                          >
                            <ReorderHandle listKey={listKey} idx={idx} count={category.items.length} />
                            <button
                              type="button"
                              onClick={() => setExpandedCareerKey(itemKey)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {item.role || <span className="italic text-gray-400 font-normal">Item #{idx + 1} — belum ada judul</span>}
                              </span>
                              {(item.company || item.period) && (
                                <span className="block text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                                  {[item.company, item.period].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedCareerKey(itemKey)}
                              className="text-[10px] px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 shrink-0"
                            >
                              Edit
                            </button>
                            <RemoveBtn onClick={() => removeCareerItem(catIdx, idx)} />
                          </div>
                        );
                      }

                      return (
                      <div
                        key={item.id || idx}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(listKey, idx)}
                        className={`p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-blue-300 dark:border-blue-700 space-y-3 transition-opacity ${
                          draggingKey === `${listKey}-${idx}` ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ReorderHandle listKey={listKey} idx={idx} count={category.items.length} />
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Item #{idx + 1}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.hintEnabled !== false}
                                onChange={(e) => setCareerItemField(catIdx, idx, 'hintEnabled', e.target.checked)}
                                className="accent-blue-600"
                              />
                              Blink pas mode Hint
                            </label>
                            <button
                              type="button"
                              onClick={() => setExpandedCareerKey(null)}
                              className="text-[10px] px-2.5 py-1 bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-300 rounded font-semibold hover:bg-gray-300 dark:hover:bg-[#454545]"
                            >
                              Tutup
                            </button>
                            <RemoveBtn onClick={() => removeCareerItem(catIdx, idx)} label="Hapus Item" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input type="text" value={item.role} onChange={(e) => setCareerItemField(catIdx, idx, 'role', e.target.value)} placeholder="Posisi / Peran" className={inputClsSm} />
                          <input type="text" value={item.company} onChange={(e) => setCareerItemField(catIdx, idx, 'company', e.target.value)} placeholder="Nama Instansi / Perusahaan" className={inputClsSm} />
                          <input type="text" value={item.location} onChange={(e) => setCareerItemField(catIdx, idx, 'location', e.target.value)} placeholder="Lokasi" className={inputClsSm} />
                          <input type="text" value={item.period} onChange={(e) => setCareerItemField(catIdx, idx, 'period', e.target.value)} placeholder="Periode (mis. 2024 – Present)" className={inputClsSm} />
                        </div>
                        <textarea rows={2} value={item.description} onChange={(e) => setCareerItemField(catIdx, idx, 'description', e.target.value)} placeholder="Deskripsi singkat" className={`${inputClsSm} resize-none`} />

                        <div className="p-3 bg-white dark:bg-[#1e1e1e] rounded border border-dashed border-gray-300 dark:border-gray-600 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Pop-up Detail Instansi</span>
                          <input type="text" value={item.companyInfo.name} onChange={(e) => setCareerCompanyInfoField(catIdx, idx, 'name', e.target.value)} placeholder="Nama Lengkap Instansi" className={inputClsSm} />
                          <input type="text" value={item.companyInfo.address} onChange={(e) => setCareerCompanyInfoField(catIdx, idx, 'address', e.target.value)} placeholder="Alamat Instansi" className={inputClsSm} />

                          <div className="flex items-center gap-2">
                            {item.companyInfo.photo && (
                              <img src={item.companyInfo.photo} alt={item.companyInfo.name} className="w-10 h-10 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingCompanyPhoto === `${catIdx}-${idx}`}
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const key = `${catIdx}-${idx}`;
                                setUploadingCompanyPhoto(key);
                                const url = await uploadImageToStorage(file);
                                setUploadingCompanyPhoto(null);
                                if (url) setCareerCompanyInfoField(catIdx, idx, 'photo', url);
                                e.target.value = '';
                              }}
                              className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                            />
                          </div>
                          <input type="text" value={item.companyInfo.photo} onChange={(e) => setCareerCompanyInfoField(catIdx, idx, 'photo', e.target.value)} placeholder="Atau tempel URL Foto Instansi" className={inputClsSm} />

                          <textarea rows={2} value={item.companyInfo.about} onChange={(e) => setCareerCompanyInfoField(catIdx, idx, 'about', e.target.value)} placeholder="Deskripsi Singkat Instansi" className={`${inputClsSm} resize-none`} />
                        </div>
                      </div>
                      );
                    })}

                    {/* -------- Item TIPE 'credential': nama pencapaian/sertifikat, penyelenggara, tanggal, bukti -------- */}
                    {/* Sama pola collapsed/expand + reorder kayak tipe 'career' di atas. */}
                    {isCredential && category.items.map((item, idx) => {
                      const itemKey = `${catIdx}-${idx}`;
                      const isOpen = expandedCareerKey === itemKey;

                      if (!isOpen) {
                        return (
                          <div
                            key={item.id || idx}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop(listKey, idx)}
                            className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 transition-opacity ${
                              draggingKey === `${listKey}-${idx}` ? 'opacity-40' : ''
                            }`}
                          >
                            <ReorderHandle listKey={listKey} idx={idx} count={category.items.length} />
                            <button
                              type="button"
                              onClick={() => setExpandedCareerKey(itemKey)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {item.title || <span className="italic text-gray-400 font-normal">Item #{idx + 1} — belum ada judul</span>}
                              </span>
                              {(item.issuer || item.date) && (
                                <span className="block text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                                  {[item.issuer, item.date].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedCareerKey(itemKey)}
                              className="text-[10px] px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 shrink-0"
                            >
                              Edit
                            </button>
                            <RemoveBtn onClick={() => removeCareerItem(catIdx, idx)} />
                          </div>
                        );
                      }

                      return (
                      <div
                        key={item.id || idx}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(listKey, idx)}
                        className={`p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-blue-300 dark:border-blue-700 space-y-3 transition-opacity ${
                          draggingKey === `${listKey}-${idx}` ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ReorderHandle listKey={listKey} idx={idx} count={category.items.length} />
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Item #{idx + 1}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.hintEnabled !== false}
                                onChange={(e) => setCareerItemField(catIdx, idx, 'hintEnabled', e.target.checked)}
                                className="accent-blue-600"
                              />
                              Blink pas mode Hint
                            </label>
                            <button
                              type="button"
                              onClick={() => setExpandedCareerKey(null)}
                              className="text-[10px] px-2.5 py-1 bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-300 rounded font-semibold hover:bg-gray-300 dark:hover:bg-[#454545]"
                            >
                              Tutup
                            </button>
                            <RemoveBtn onClick={() => removeCareerItem(catIdx, idx)} label="Hapus Item" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input type="text" value={item.title} onChange={(e) => setCareerItemField(catIdx, idx, 'title', e.target.value)} placeholder="Nama Pencapaian / Sertifikat" className={inputClsSm} />
                          <input type="text" value={item.issuer} onChange={(e) => setCareerItemField(catIdx, idx, 'issuer', e.target.value)} placeholder="Penyelenggara / Penerbit" className={inputClsSm} />
                          <input type="text" value={item.date} onChange={(e) => setCareerItemField(catIdx, idx, 'date', e.target.value)} placeholder="Tanggal (mis. Mei 2026)" className={inputClsSm} />
                          <input type="text" value={item.verifyUrl} onChange={(e) => setCareerItemField(catIdx, idx, 'verifyUrl', e.target.value)} placeholder="Link Verifikasi / Bukti (opsional)" className={inputClsSm} />
                        </div>
                        <textarea rows={2} value={item.description} onChange={(e) => setCareerItemField(catIdx, idx, 'description', e.target.value)} placeholder="Deskripsi singkat (opsional)" className={`${inputClsSm} resize-none`} />

                        <div className="p-3 bg-white dark:bg-[#1e1e1e] rounded border border-dashed border-gray-300 dark:border-gray-600 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Gambar Bukti (sertifikat/foto pencapaian)</span>
                          <div className="flex items-center gap-2">
                            {item.image && (
                              <img src={item.image} alt={item.title} className="w-14 h-14 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingCompanyPhoto === `${catIdx}-${idx}`}
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const key = `${catIdx}-${idx}`;
                                setUploadingCompanyPhoto(key);
                                const url = await uploadImageToStorage(file);
                                setUploadingCompanyPhoto(null);
                                if (url) setCareerItemField(catIdx, idx, 'image', url);
                                e.target.value = '';
                              }}
                              className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                            />
                          </div>
                          <input type="text" value={item.image} onChange={(e) => setCareerItemField(catIdx, idx, 'image', e.target.value)} placeholder="Atau tempel URL Gambar" className={inputClsSm} />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AddBtn onClick={() => addCareerCategory('career')} label="Tambah Kategori Riwayat" />
              <AddBtn onClick={() => addCareerCategory('credential')} label="Tambah Kategori Pencapaian/Sertifikat" />
            </div>
          </div>
        )}

        {/* ================= BOOK ================= */}
        {activeTab === 'book' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400">Tab Book</h2>
              <AddBtn onClick={addBook} label="Tambah Buku/Karya" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Judul Halaman (mis. Books, Writings & Open Source)">
                <input type="text" value={formData.books.heading} onChange={(e) => setBooksHeading('heading', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sub-judul / Keterangan Singkat">
                <input type="text" value={formData.books.subheading} onChange={(e) => setBooksHeading('subheading', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {formData.books.items.length === 0 && (
              <p className="text-[11px] text-gray-400 italic">Belum ada karya.</p>
            )}

            {formData.books.items.map((book, idx) => (
              <div key={book.id || idx} className="p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Item #{idx + 1}</h4>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={book.hintEnabled !== false}
                        onChange={(e) => setBookField(idx, 'hintEnabled', e.target.checked)}
                        className="accent-blue-600"
                      />
                      Blink pas mode Hint
                    </label>
                    <RemoveBtn onClick={() => removeBook(idx)} />
                  </div>
                </div>
                <input type="text" value={book.title} onChange={(e) => setBookField(idx, 'title', e.target.value)} placeholder="Judul Buku / Karya" className={inputClsSm} />
                <input type="text" value={book.category} onChange={(e) => setBookField(idx, 'category', e.target.value)} placeholder="Kategori (mis. E-Book / Artikel)" className={inputClsSm} />
                <textarea rows={2} value={book.summary} onChange={(e) => setBookField(idx, 'summary', e.target.value)} placeholder="Ringkasan singkat" className={`${inputClsSm} resize-none`} />
                <textarea rows={3} value={book.fullDescription} onChange={(e) => setBookField(idx, 'fullDescription', e.target.value)} placeholder="Deskripsi lengkap" className={`${inputClsSm} resize-none`} />

                <div className="flex items-center gap-2">
                  {book.coverImage && (
                    <img src={book.coverImage} alt={book.title} className="w-10 h-14 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBookCover === idx}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setUploadingBookCover(idx);
                      const url = await uploadImageToStorage(file);
                      setUploadingBookCover(null);
                      if (url) setBookField(idx, 'coverImage', url);
                      e.target.value = '';
                    }}
                    className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                  />
                </div>
                <input type="text" value={book.coverImage} onChange={(e) => setBookField(idx, 'coverImage', e.target.value)} placeholder="Atau tempel URL Cover Buku" className={inputClsSm} />

                <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] text-gray-400 mb-1.5 mt-2">
                    Foto overview — muncul di halaman kiri pas sampul buku diklik/dibuka di halaman publik (opsional)
                  </p>
                  <div className="flex items-center gap-2">
                    {book.overviewImage && (
                      <img src={book.overviewImage} alt="" className="w-14 h-10 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBookOverview === idx}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingBookOverview(idx);
                        const url = await uploadImageToStorage(file);
                        setUploadingBookOverview(null);
                        if (url) setBookField(idx, 'overviewImage', url);
                        e.target.value = '';
                      }}
                      className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                    />
                  </div>
                  <input type="text" value={book.overviewImage || ''} onChange={(e) => setBookField(idx, 'overviewImage', e.target.value)} placeholder="Atau tempel URL Foto Overview" className={`${inputClsSm} mt-2`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input type="text" value={book.pageCount || ''} onChange={(e) => setBookField(idx, 'pageCount', e.target.value)} placeholder="Jumlah Halaman (mis. 184)" className={inputClsSm} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input type="text" value={book.actionText} onChange={(e) => setBookField(idx, 'actionText', e.target.value)} placeholder="Teks Tombol (mis. Beli Buku Ini)" className={inputClsSm} />
                  <input type="text" value={book.actionUrl} onChange={(e) => setBookField(idx, 'actionUrl', e.target.value)} placeholder="Link Tombol" className={inputClsSm} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= PROJECTS ================= */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Projects</h2>

            <Field label="Heading Halaman">
              <input type="text" value={formData.projects.heading} onChange={(e) => setProjectsField('heading', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Subheading Halaman">
              <textarea rows={2} value={formData.projects.subheading} onChange={(e) => setProjectsField('subheading', e.target.value)} className={`${inputCls} resize-none`} />
            </Field>

            {/* Sub-tab: Articles / Poster / tiap Tab Tambahan dapet pill nama sendiri —
                sama kayak Articles & Poster, mirroring nav di halaman publiknya sendiri.
                "+ Tambah Tab" nempel di ujung, klik langsung bikin tab baru & pindah ke situ. */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 flex-wrap items-center">
              {[
                { key: 'articles', label: `Articles (${formData.projects.articles.length})` },
                { key: 'poster', label: `Poster (${formData.projects.poster.items.length})` },
                ...formData.projects.customSections.map((cs, idx) => ({
                  key: `custom:${cs.id}`,
                  label: cs.label || `Tab Baru #${idx + 1}`,
                })),
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveProjectsSubTab(t.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                    activeProjectsSubTab === t.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#383838]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={addCustomSection}
                title="Tambah tab baru di luar Articles & Poster"
                className="px-3 py-1.5 text-xs font-semibold rounded border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                + Tambah Tab
              </button>
            </div>

            {/* ARTICLES — gaya portal berita, artikel pertama otomatis jadi unggulan */}
            {activeProjectsSubTab === 'articles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Articles</h3>
                <AddBtn onClick={addArticle} label="Tambah Artikel" />
              </div>
              <Field label='Nama Tab (tampil di navigasi, kosongkan buat pakai "Articles")'>
                <input
                  type="text"
                  value={formData.projects.articlesLabel}
                  onChange={(e) => setProjectsField('articlesLabel', e.target.value)}
                  placeholder="Articles"
                  className={inputClsSm}
                />
              </Field>
              <p className="text-[10px] text-gray-400 -mt-1">
                Artikel #1 di daftar bakal tampil besar sebagai artikel unggulan di halaman publik, sisanya jadi daftar kecil di sampingnya. Urutan bisa diatur dengan menyusun ulang artikel di sini.
              </p>
              {formData.projects.articles.map((art, idx) => {
                const isOpen = expandedArticleIdx === idx;
                if (!isOpen) {
                  // ---------- BARIS COLLAPSED: judul + tanggal + tombol Edit doang ----------
                  return (
                    <div
                      key={art.id || idx}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop('articles', idx)}
                      className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 transition-opacity ${
                        draggingKey === `articles-${idx}` ? 'opacity-40' : ''
                      }`}
                    >
                      <ReorderHandle listKey="articles" idx={idx} count={formData.projects.articles.length} />
                      <button
                        type="button"
                        onClick={() => setExpandedArticleIdx(idx)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {idx === 0 && <span className="text-blue-500 mr-1">(Unggulan)</span>}
                          {art.title || <span className="italic text-gray-400 font-normal">Artikel #{idx + 1} — belum ada judul</span>}
                        </span>
                        {art.date && (
                          <span className="block text-[10px] font-mono text-gray-400 mt-0.5">{art.date}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedArticleIdx(idx)}
                        className="text-[10px] px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 shrink-0"
                      >
                        Edit
                      </button>
                      <RemoveBtn onClick={() => removeArticle(idx)} />
                    </div>
                  );
                }

                // ---------- BARIS EXPANDED: form lengkap 1 artikel ----------
                return (
                <div
                  key={art.id || idx}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop('articles', idx)}
                  className={`p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-blue-300 dark:border-blue-700 space-y-2 transition-opacity ${
                    draggingKey === `articles-${idx}` ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ReorderHandle listKey="articles" idx={idx} count={formData.projects.articles.length} />
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Artikel #{idx + 1} {idx === 0 && <span className="text-blue-500">(Unggulan)</span>}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={art.hintEnabled !== false}
                          onChange={(e) => setArticleField(idx, 'hintEnabled', e.target.checked)}
                          className="accent-blue-600"
                        />
                        Blink pas mode Hint
                      </label>
                      <button
                        type="button"
                        onClick={() => setExpandedArticleIdx(null)}
                        className="text-[10px] px-2.5 py-1 bg-gray-200 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-300 rounded font-semibold hover:bg-gray-300 dark:hover:bg-[#454545]"
                      >
                        Tutup
                      </button>
                      <RemoveBtn onClick={() => removeArticle(idx)} />
                    </div>
                  </div>
                  <input type="text" value={art.title} onChange={(e) => setArticleField(idx, 'title', e.target.value)} placeholder="Judul Artikel" className={inputClsSm} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="text" value={art.date} onChange={(e) => setArticleField(idx, 'date', e.target.value)} placeholder="Tanggal (mis. 12 Mei 2026)" className={inputClsSm} />
                    <input type="text" value={art.category} onChange={(e) => setArticleField(idx, 'category', e.target.value)} placeholder="Kategori (mis. ESAI)" className={inputClsSm} />
                    <input type="text" value={art.author} onChange={(e) => setArticleField(idx, 'author', e.target.value)} placeholder="Penulis (opsional)" className={inputClsSm} />
                  </div>

                  <div className="flex items-center gap-2">
                    {art.image && (
                      <img src={art.image} alt={art.title} className="w-16 h-12 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingArticleImage === idx}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingArticleImage(idx);
                        const url = await uploadImageToStorage(file);
                        setUploadingArticleImage(null);
                        if (url) setArticleField(idx, 'image', url);
                        e.target.value = '';
                      }}
                      className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                    />
                  </div>
                  <input type="text" value={art.image} onChange={(e) => setArticleField(idx, 'image', e.target.value)} placeholder="Atau tempel URL Gambar Artikel (dari galeri/hosting lain)" className={inputClsSm} />

                  <textarea rows={2} value={art.snippet} onChange={(e) => setArticleField(idx, 'snippet', e.target.value)} placeholder="Cuplikan singkat" className={`${inputClsSm} resize-none`} />

                  <div>
                    <label className="block text-[10px] font-medium mb-1 text-gray-500">Isi Lengkap Artikel (bisa Bold/Italic/Underline/List/Link)</label>
                    <RichTextEditor
                      key={art.id || idx}
                      initialValue={art.content}
                      onChange={(html) => setArticleField(idx, 'content', html)}
                      placeholder="Tulis isi artikel lengkap di sini..."
                    />
                  </div>
                </div>
                );
              })}
            </div>
            )}

            {/* POSTER — daftar file langsung, klik "Tambah Poster" langsung nambah item baru */}
            {activeProjectsSubTab === 'poster' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Poster</h3>
                <AddBtn onClick={addPosterItem} label="Tambah Poster" />
              </div>
              <Field label='Nama Tab (tampil di navigasi, kosongkan buat pakai "Poster")'>
                <input
                  type="text"
                  value={formData.projects.posterLabel}
                  onChange={(e) => setProjectsField('posterLabel', e.target.value)}
                  placeholder="Poster"
                  className={inputClsSm}
                />
              </Field>
              {formData.projects.poster.items.length === 0 && (
                <p className="text-[10px] text-gray-400 italic">Belum ada poster. Klik "+ Tambah Poster" buat mulai.</p>
              )}
              {formData.projects.poster.items.map((it, idx) =>
                renderPosterItem(it, idx, formData.projects.poster.items)
              )}
            </div>
            )}

            {/* TAB TAMBAHAN — tiap custom section udah dapet pill nav sendiri di atas
                (sejajar Articles/Poster), jadi di sini cuma render section yang lagi
                aktif aja (dicari lewat activeProjectsSubTab = "custom:<id>"). */}
            {activeProjectsSubTab.startsWith('custom:') && (() => {
              const sectionIdx = formData.projects.customSections.findIndex(
                (cs) => `custom:${cs.id}` === activeProjectsSubTab
              );
              if (sectionIdx === -1) return null;
              return (
                <div className="space-y-3">
                  {renderCustomSectionBlock(formData.projects.customSections[sectionIdx], sectionIdx)}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= CONTACT ================= */}
        {activeTab === 'contact' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Contact</h2>

            <Field label="Heading Utama">
              <input type="text" value={formData.contact.heading} onChange={(e) => setContactField('heading', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Subheading">
              <textarea rows={2} value={formData.contact.subheading} onChange={(e) => setContactField('subheading', e.target.value)} className={`${inputCls} resize-none`} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email">
                <input type="text" value={formData.contact.email} onChange={(e) => setContactField('email', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Lokasi">
                <input type="text" value={formData.contact.location} onChange={(e) => setContactField('location', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Pesan Penutup (Closing Text)">
              <input type="text" value={formData.contact.closingText} onChange={(e) => setContactField('closingText', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Teks Tombol Kolaborasi">
                <input type="text" value={formData.contact.collabButtonText} onChange={(e) => setContactField('collabButtonText', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Link Tombol Kolaborasi">
                <input type="text" value={formData.contact.collabButtonUrl} onChange={(e) => setContactField('collabButtonUrl', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Isi Pesan / Body Email (opsional, khusus kalau Link di atas alamat email)">
              <textarea
                rows={3}
                value={formData.contact.collabButtonBody || ''}
                onChange={(e) => setContactField('collabButtonBody', e.target.value)}
                placeholder={'Halo, saya tertarik untuk berkolaborasi mengenai...'}
                className={`${inputCls} resize-none`}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Diisi otomatis ke email pas tombol diklik, biar pengunjung tinggal edit dikit terus kirim — gak perlu ngetik dari nol.
              </p>
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium">Sosial Media</label>
                <AddBtn onClick={addSocial} label="Tambah Sosmed" />
              </div>
              <div className="space-y-2">
                {formData.contact.socials.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input type="text" value={s.name} onChange={(e) => setSocialField(idx, 'name', e.target.value)} placeholder="Nama (mis. LinkedIn)" className={inputClsSm} />
                    <input type="text" value={s.url} onChange={(e) => setSocialField(idx, 'url', e.target.value)} placeholder="URL" className={inputClsSm} />
                    <input type="text" value={s.label} onChange={(e) => setSocialField(idx, 'label', e.target.value)} placeholder="Label (mis. Connect on LinkedIn)" className={inputClsSm} />
                    <RemoveBtn onClick={() => removeSocial(idx)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium">Tombol Aksi (mis. Hire Me, Download Resume)</label>
                <AddBtn onClick={addActionButton} label="Tambah Tombol" />
              </div>
              <p className="text-[10px] text-gray-400 mb-2">
                Buat tombol "Download Resume": isi Label-nya, terus di kolom Link tinggal upload file
                PDF-nya langsung dari perangkat lo — link publiknya otomatis keisi sendiri.
              </p>
              <div className="space-y-2">
                {formData.contact.actionButtons.map((btn, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-2 space-y-1.5">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                      <input type="text" value={btn.label} onChange={(e) => setActionButtonField(idx, 'label', e.target.value)} placeholder="Label Tombol" className={inputClsSm} />
                      <input type="text" value={btn.url} onChange={(e) => setActionButtonField(idx, 'url', e.target.value)} placeholder="Link (atau upload file di bawah)" className={inputClsSm} />
                      <label className="flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap">
                        <input type="checkbox" checked={!!btn.primary} onChange={(e) => setActionButtonField(idx, 'primary', e.target.checked)} />
                        Utama
                      </label>
                      <RemoveBtn onClick={() => removeActionButton(idx)} />
                    </div>
                    <div className="flex items-center gap-2 pl-0.5">
                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/*"
                        disabled={uploadingActionButton === idx}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          setUploadingActionButton(idx);
                          const url = await uploadImageToStorage(file);
                          setUploadingActionButton(null);
                          if (url) setActionButtonField(idx, 'url', url);
                          e.target.value = '';
                        }}
                        className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                      />
                      {uploadingActionButton === idx && (
                        <span className="text-[10px] text-blue-500 animate-pulse shrink-0">Mengupload...</span>
                      )}
                      {btn.url && !uploadingActionButton && (
                        <a href={btn.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-blue-600 underline shrink-0">
                          Lihat file saat ini
                        </a>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={btn.body || ''}
                      onChange={(e) => setActionButtonField(idx, 'body', e.target.value)}
                      placeholder="Isi Pesan / Body Email (opsional, khusus kalau Link di atas alamat email)"
                      className={`${inputClsSm} resize-none`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ODDS ================= */}
        {activeTab === 'odds' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Odds</h2>
            <p className="text-xs text-gray-500 italic">
              Serpihan kalimat/frasa pendek dari tulisan lo — bakal muncul samar bertebaran di
              latar SEMUA tab (Home, About, Career, dst) sekaligus. Satu baris di bawah = satu
              serpihan. Nggak perlu rapi/urut, makin acak makin bagus efeknya.
            </p>
            <Field label={`Daftar Serpihan (${formData.odds.filter((s) => s.trim()).length} terisi)`}>
              <textarea
                rows={12}
                value={formData.odds.join('\n')}
                onChange={(e) => setOdds(e.target.value)}
                placeholder={'Contoh:\nrindu itu kata kerja, bukan kata benda\nnanggung sekali, katanya\nkita semua sedang berlatih pulang'}
                className={`${inputCls} resize-y font-mono`}
              />
            </Field>
          </div>
        )}

        {/* ================= QUOTES ================= */}
        {activeTab === 'quotes' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Quotes</h2>
            <p className="text-xs text-gray-500 italic">
              Kutipan-kutipan ini muncul di balon komentar berjalan yang nempel di tepi kanan
              layar (jalan ke atas terus-menerus, loop). Beda dari Odds — ini kalimat yang
              beneran kebaca jelas sebagai kutipan, bukan tekstur latar. Satu baris di bawah
              = satu kutipan.
            </p>
            <Field label={`Daftar Kutipan (${formData.quotes.filter((s) => s.trim()).length} terisi)`}>
              <textarea
                rows={12}
                value={formData.quotes.join('\n')}
                onChange={(e) => setQuotes(e.target.value)}
                placeholder={'Contoh:\n"Konsistensi ngalahin motivasi sesaat."\n"Bug paling galak muncul pas demo doang."'}
                className={`${inputCls} resize-y font-mono`}
              />
            </Field>
          </div>
        )}

        {/* ================= GENERAL ================= */}
        {activeTab === 'general' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab General</h2>
            <p className="text-xs text-gray-500 italic">
              Pengaturan situs secara keseluruhan — bukan punya satu halaman tertentu, jadi
              kepisah dari 6 tab konten di atas.
            </p>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100">Notifikasi Welcome</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Kartu sambutan yang muncul otomatis pas orang pertama buka web. Desktop:
                    pojok kanan-bawah. HP: melayang di bawah, lebar penuh. Muncul sekali per
                    kunjungan (per tab browser), ada tombol tutup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWelcomeNotification('enabled', !formData.general.welcomeNotification.enabled)}
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                    formData.general.welcomeNotification.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  title={formData.general.welcomeNotification.enabled ? 'Aktif — klik buat matiin' : 'Mati — klik buat nyalain'}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.general.welcomeNotification.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <Field label="Judul">
                <input
                  type="text"
                  value={formData.general.welcomeNotification.title}
                  onChange={(e) => setWelcomeNotification('title', e.target.value)}
                  placeholder="Selamat datang! 👋"
                  className={inputCls}
                />
              </Field>

              <Field label="Pesan">
                <textarea
                  rows={3}
                  value={formData.general.welcomeNotification.message}
                  onChange={(e) => setWelcomeNotification('message', e.target.value)}
                  placeholder="Terima kasih udah mampir ke portofolio saya."
                  className={`${inputCls} resize-y`}
                />
              </Field>

              <Field label="Muncul setelah (detik)">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.general.welcomeNotification.delaySeconds}
                  onChange={(e) => setWelcomeNotification('delaySeconds', Math.max(0, Number(e.target.value) || 0))}
                  className={`${inputCls} max-w-[120px]`}
                />
              </Field>
            </div>
          </div>
        )}
      </>
      )}

      </form>
    </div>
  );
}