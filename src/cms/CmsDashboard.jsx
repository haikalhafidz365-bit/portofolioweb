import React, { useState, useRef, useEffect } from 'react';
import { supabase, IMAGES_BUCKET } from '../lib/supabaseClient';

const TABS = ['home', 'about', 'career', 'book', 'projects', 'contact', 'patrol', 'odds', 'quotes', 'general'];

// Daftar tab publik yang butuh teks guidance sendiri-sendiri di section Patrol — SENGAJA
// pakai nama persis kayak `activeTab` di App.jsx (huruf besar di awal: 'Home', 'About',
// dst), biar App.jsx bisa langsung ambil `portfolioData.patrol[activeTab]` tanpa perlu
// mapping tambahan.
const PATROL_TABS = ['Home', 'About', 'Career', 'Book', 'Projects', 'Contact'];

// Metadata buat kartu menu utama CMS — cukup diedit di sini kalau mau ganti label/ikon/deskripsi
const TAB_META = {
  home: { label: 'Home', desc: 'Nama, role, bio singkat & foto profil' },
  about: { label: 'About', desc: 'Cerita Live, Life, Laugh' },
  career: { label: 'Career', desc: 'Riwayat sekolah, kuliah & profesional' },
  book: { label: 'Book', desc: 'Buku, tulisan & karya open-source' },
  projects: { label: 'Projects', desc: 'Artikel & galeri visual' },
  contact: { label: 'Contact', desc: 'Info kontak, sosmed & tombol aksi' },
  patrol: { label: 'Patrol', desc: 'Teks guidance/hint statis buat pengunjung, satu per tab' },
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
// Jaring pengaman sama kayak normalizeGeneral: kalau data lama di Supabase belum
// punya field `patrol` sama sekali, atau cuma punya sebagian tab-nya, isi kosong
// dulu buat tab yang belum ada (biar textarea-nya gak "undefined" & gak crash).
const DEFAULT_PATROL_HEADING = 'Guidance / Hint';
function normalizePatrol(raw) {
  const out = { heading: raw?.heading || DEFAULT_PATROL_HEADING };
  PATROL_TABS.forEach((tab) => {
    out[tab] = typeof raw?.[tab] === 'string' ? raw[tab] : '';
  });
  return out;
}

const CAREER_CATEGORIES = ['professional', 'school', 'college'];

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

// Jaga-jaga: data career di Supabase bisa aja masih format lama (array polos berisi
// item riwayat langsung), sementara format baru butuh { bgImage, items }. Fungsi ini
// nyamain keduanya jadi format baru biar CMS gak crash gara-gara baca .items dari
// data yang ternyata masih array lama.
function normalizeCareerCategory(raw) {
  if (Array.isArray(raw)) return { bgImage: '', items: raw };
  if (raw && typeof raw === 'object') {
    return { bgImage: raw.bgImage || '', items: Array.isArray(raw.items) ? raw.items : [] };
  }
  return { bgImage: '', items: [] };
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

const emptyGalleryItem = (type) => ({
  id: `${type}-${Date.now()}`,
  title: '',
  category: '',
  dimensions: '',
  imageUrl: '',
  description: '',
  hintEnabled: true,
});

// Jaga-jaga: data projects di Supabase bisa aja masih format lama (projects.posters
// array polos, tanpa heading/subheading, tanpa gallery), sementara format baru butuh
// { heading, subheading, articles, gallery: { poster, photo } }.
function normalizeProjectsData(raw) {
  const projects = raw || {};
  const articles = Array.isArray(projects.articles) ? projects.articles : [];

  let gallery = projects.gallery;
  if (!gallery || typeof gallery !== 'object' || Array.isArray(gallery)) {
    // Format lama: projects.posters adalah array polos
    gallery = { poster: Array.isArray(projects.posters) ? projects.posters : [], photo: [] };
  } else {
    gallery = {
      poster: Array.isArray(gallery.poster) ? gallery.poster : [],
      photo: Array.isArray(gallery.photo) ? gallery.photo : [],
    };
  }

  return {
    heading: projects.heading || '',
    subheading: projects.subheading || '',
    articles,
    gallery,
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

export default function CmsDashboard({ data, onSave, onClose }) {
  // Salinan lokal yang bisa diedit bebas — baru dikirim ke portfolioData asli pas Save ditekan.
  const [formData, setFormData] = useState(() => {
    const cloned = JSON.parse(JSON.stringify(data));
    const normalizedCareer = {
      heading: cloned.career?.heading || '',
      subheading: cloned.career?.subheading || '',
    };
    CAREER_CATEGORIES.forEach((cat) => {
      normalizedCareer[cat] = normalizeCareerCategory(cloned.career?.[cat]);
    });
    return {
      ...cloned,
      career: normalizedCareer,
      books: normalizeBooksData(cloned.books),
      projects: normalizeProjectsData(cloned.projects),
      patrol: normalizePatrol(cloned.patrol),
      odds: Array.isArray(cloned.odds) ? cloned.odds : [],
      quotes: Array.isArray(cloned.quotes) ? cloned.quotes : [],
      general: normalizeGeneral(cloned.general),
    };
  });
  // null = layar menu utama (pilih salah satu dari 6 tab dulu sebelum masuk ke isinya)
  const [activeTab, setActiveTab] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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
  // Kunci berupa "poster-idx" / "photo-idx" buat nandain item gallery mana yang lagi upload
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(null);

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
      const normalizedCareer = {
        heading: cloned.career?.heading || '',
        subheading: cloned.career?.subheading || '',
      };
      CAREER_CATEGORIES.forEach((cat) => {
        normalizedCareer[cat] = normalizeCareerCategory(cloned.career?.[cat]);
      });
      setFormData({
        ...cloned,
        career: normalizedCareer,
        books: normalizeBooksData(cloned.books),
        projects: normalizeProjectsData(cloned.projects),
        patrol: normalizePatrol(cloned.patrol),
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

  /* ============ PATROL ============ */
  // Satu setter buat 2 hal: teks guidance per tab (kirim tabKey = 'Home'/'About'/dst)
  // dan judul kotaknya sendiri (kirim tabKey = 'heading').
  const setPatrol = (tabKey, value) =>
    setFormData((p) => ({ ...p, patrol: { ...p.patrol, [tabKey]: value } }));

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

  // Ganti gambar latar kartu menu (School/College/Professional) di halaman publik
  const setCareerBgImage = (category, value) =>
    setFormData((p) => ({
      ...p,
      career: { ...p.career, [category]: { ...p.career[category], bgImage: value } },
    }));

  const setCareerItemField = (category, idx, field, value) =>
    setFormData((p) => {
      const items = [...p.career[category].items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...p, career: { ...p.career, [category]: { ...p.career[category], items } } };
    });

  const setCareerCompanyInfoField = (category, idx, field, value) =>
    setFormData((p) => {
      const items = [...p.career[category].items];
      items[idx] = {
        ...items[idx],
        companyInfo: { ...items[idx].companyInfo, [field]: value },
      };
      return { ...p, career: { ...p.career, [category]: { ...p.career[category], items } } };
    });

  const addCareerItem = (category) =>
    setFormData((p) => ({
      ...p,
      career: {
        ...p.career,
        [category]: { ...p.career[category], items: [...p.career[category].items, emptyCareerItem()] },
      },
    }));

  const removeCareerItem = (category, idx) =>
    setFormData((p) => ({
      ...p,
      career: {
        ...p.career,
        [category]: { ...p.career[category], items: p.career[category].items.filter((_, i) => i !== idx) },
      },
    }));

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
  const addArticle = () =>
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, articles: [...p.projects.articles, emptyArticle()] },
    }));
  const removeArticle = (idx) =>
    setFormData((p) => ({
      ...p,
      projects: { ...p.projects, articles: p.projects.articles.filter((_, i) => i !== idx) },
    }));

  const setGalleryItemField = (type, idx, field, value) =>
    setFormData((p) => {
      const items = [...p.projects.gallery[type]];
      items[idx] = { ...items[idx], [field]: value };
      return { ...p, projects: { ...p.projects, gallery: { ...p.projects.gallery, [type]: items } } };
    });
  const addGalleryItem = (type) =>
    setFormData((p) => ({
      ...p,
      projects: {
        ...p.projects,
        gallery: { ...p.projects.gallery, [type]: [...p.projects.gallery[type], emptyGalleryItem(type)] },
      },
    }));
  const removeGalleryItem = (type, idx) =>
    setFormData((p) => ({
      ...p,
      projects: {
        ...p.projects,
        gallery: { ...p.projects.gallery, [type]: p.projects.gallery[type].filter((_, i) => i !== idx) },
      },
    }));

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
        actionButtons: [...p.contact.actionButtons, { label: '', url: '', primary: false }],
      },
    }));
  const removeActionButton = (idx) =>
    setFormData((p) => ({
      ...p,
      contact: { ...p.contact, actionButtons: p.contact.actionButtons.filter((_, i) => i !== idx) },
    }));

  /* ============ REORDER (Articles & Gallery) ============ */
  // listKey: 'articles', 'poster', atau 'photo' — nyimpen daftar mana yang lagi diurutin
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
    } else {
      setFormData((p) => {
        const items = p.projects.gallery[listKey];
        if (toIdx >= items.length) return p;
        const newItems = [...items];
        const [moved] = newItems.splice(fromIdx, 1);
        newItems.splice(toIdx, 0, moved);
        return { ...p, projects: { ...p.projects, gallery: { ...p.projects.gallery, [listKey]: newItems } } };
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

  // Blok form Gallery — dipakai sama persis buat sub-tab Poster maupun Photo,
  // biar dua-duanya konsisten (cuma beda "type": 'poster' atau 'photo')
  const GallerySection = ({ type, label, items }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</h3>
        <AddBtn onClick={() => addGalleryItem(type)} label={`Tambah ${type === 'poster' ? 'Poster' : 'Foto'}`} />
      </div>
      {items.map((it, idx) => (
        <div
          key={it.id || idx}
          onDragOver={handleDragOver}
          onDrop={handleDrop(type, idx)}
          className={`p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 space-y-2 transition-opacity ${
            draggingKey === `${type}-${idx}` ? 'opacity-40' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ReorderHandle listKey={type} idx={idx} count={items.length} />
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {type === 'poster' ? 'Poster' : 'Foto'} #{idx + 1}
              </h4>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={it.hintEnabled !== false}
                  onChange={(e) => setGalleryItemField(type, idx, 'hintEnabled', e.target.checked)}
                  className="accent-blue-600"
                />
                Blink pas mode Hint
              </label>
              <RemoveBtn onClick={() => removeGalleryItem(type, idx)} />
            </div>
          </div>
          <input type="text" value={it.title} onChange={(e) => setGalleryItemField(type, idx, 'title', e.target.value)} placeholder="Judul" className={inputClsSm} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input type="text" value={it.category} onChange={(e) => setGalleryItemField(type, idx, 'category', e.target.value)} placeholder="Kategori" className={inputClsSm} />
            <input type="text" value={it.dimensions} onChange={(e) => setGalleryItemField(type, idx, 'dimensions', e.target.value)} placeholder="Dimensi/Info (mis. 2400x3000px)" className={inputClsSm} />
          </div>

          <div className="flex items-center gap-2">
            {it.imageUrl && (
              <img src={it.imageUrl} alt={it.title} className="w-14 h-14 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploadingGalleryImage === `${type}-${idx}`}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploadingGalleryImage(`${type}-${idx}`);
                const url = await uploadImageToStorage(file);
                setUploadingGalleryImage(null);
                if (url) setGalleryItemField(type, idx, 'imageUrl', url);
                e.target.value = '';
              }}
              className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
            />
          </div>
          <input type="text" value={it.imageUrl} onChange={(e) => setGalleryItemField(type, idx, 'imageUrl', e.target.value)} placeholder="Atau tempel URL Gambar (dari galeri/hosting lain)" className={inputClsSm} />

          <textarea rows={2} value={it.description} onChange={(e) => setGalleryItemField(type, idx, 'description', e.target.value)} placeholder="Deskripsi singkat (penjelasan karya)" className={`${inputClsSm} resize-none`} />
        </div>
      ))}
    </div>
  );

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
            <p className="text-xs text-gray-500 italic">Setiap item riwayat dilengkapi pop-up detail instansi (nama, alamat, foto, deskripsi).</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Judul Halaman (mis. Career & Education)">
                <input type="text" value={formData.career.heading} onChange={(e) => setCareerHeading('heading', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sub-judul / Keterangan Singkat">
                <input type="text" value={formData.career.subheading} onChange={(e) => setCareerHeading('subheading', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {CAREER_CATEGORIES.map((category) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{category}</h3>
                  <AddBtn onClick={() => addCareerItem(category)} label="Tambah Item" />
                </div>

                {/* Gambar latar kartu menu (School/College/Professional) di halaman publik */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded border border-dashed border-blue-200 dark:border-blue-900 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Gambar Latar Kartu Menu "{category}"</span>
                  <div className="flex items-center gap-3">
                    {formData.career[category].bgImage && (
                      <img src={formData.career[category].bgImage} alt={category} className="w-16 h-12 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCareerBg === category}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingCareerBg(category);
                        const url = await uploadImageToStorage(file);
                        setUploadingCareerBg(null);
                        if (url) setCareerBgImage(category, url);
                        e.target.value = '';
                      }}
                      className="flex-1 text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                    />
                    {formData.career[category].bgImage && (
                      <button type="button" onClick={() => setCareerBgImage(category, '')} className="text-[10px] text-red-500 hover:text-red-600 font-semibold shrink-0">
                        Hapus
                      </button>
                    )}
                  </div>
                  {uploadingCareerBg === category && (
                    <p className="text-[10px] text-blue-500 animate-pulse">Mengupload gambar...</p>
                  )}
                  <input
                    type="text"
                    value={formData.career[category].bgImage}
                    onChange={(e) => setCareerBgImage(category, e.target.value)}
                    placeholder="Atau tempel URL gambar langsung di sini"
                    className={inputClsSm}
                  />
                  <p className="text-[10px] text-gray-400">Kosongkan aja kalau belum ada — nanti otomatis pakai warna gradasi default.</p>
                </div>

                {formData.career[category].items.length === 0 && (
                  <p className="text-[11px] text-gray-400 italic">Belum ada item.</p>
                )}

                {formData.career[category].items.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Item #{idx + 1}</h4>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.hintEnabled !== false}
                            onChange={(e) => setCareerItemField(category, idx, 'hintEnabled', e.target.checked)}
                            className="accent-blue-600"
                          />
                          Blink pas mode Hint
                        </label>
                        <RemoveBtn onClick={() => removeCareerItem(category, idx)} label="Hapus Item" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input type="text" value={item.role} onChange={(e) => setCareerItemField(category, idx, 'role', e.target.value)} placeholder="Posisi / Peran" className={inputClsSm} />
                      <input type="text" value={item.company} onChange={(e) => setCareerItemField(category, idx, 'company', e.target.value)} placeholder="Nama Instansi / Perusahaan" className={inputClsSm} />
                      <input type="text" value={item.location} onChange={(e) => setCareerItemField(category, idx, 'location', e.target.value)} placeholder="Lokasi" className={inputClsSm} />
                      <input type="text" value={item.period} onChange={(e) => setCareerItemField(category, idx, 'period', e.target.value)} placeholder="Periode (mis. 2024 – Present)" className={inputClsSm} />
                    </div>
                    <textarea rows={2} value={item.description} onChange={(e) => setCareerItemField(category, idx, 'description', e.target.value)} placeholder="Deskripsi singkat" className={`${inputClsSm} resize-none`} />

                    <div className="p-3 bg-white dark:bg-[#1e1e1e] rounded border border-dashed border-gray-300 dark:border-gray-600 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Pop-up Detail Instansi</span>
                      <input type="text" value={item.companyInfo.name} onChange={(e) => setCareerCompanyInfoField(category, idx, 'name', e.target.value)} placeholder="Nama Lengkap Instansi" className={inputClsSm} />
                      <input type="text" value={item.companyInfo.address} onChange={(e) => setCareerCompanyInfoField(category, idx, 'address', e.target.value)} placeholder="Alamat Instansi" className={inputClsSm} />

                      <div className="flex items-center gap-2">
                        {item.companyInfo.photo && (
                          <img src={item.companyInfo.photo} alt={item.companyInfo.name} className="w-10 h-10 rounded object-cover border border-gray-300 dark:border-gray-600 shrink-0" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingCompanyPhoto === `${category}-${idx}`}
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const key = `${category}-${idx}`;
                            setUploadingCompanyPhoto(key);
                            const url = await uploadImageToStorage(file);
                            setUploadingCompanyPhoto(null);
                            if (url) setCareerCompanyInfoField(category, idx, 'photo', url);
                            e.target.value = '';
                          }}
                          className="flex-1 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 disabled:opacity-60"
                        />
                      </div>
                      <input type="text" value={item.companyInfo.photo} onChange={(e) => setCareerCompanyInfoField(category, idx, 'photo', e.target.value)} placeholder="Atau tempel URL Foto Instansi" className={inputClsSm} />

                      <textarea rows={2} value={item.companyInfo.about} onChange={(e) => setCareerCompanyInfoField(category, idx, 'about', e.target.value)} placeholder="Deskripsi Singkat Instansi" className={`${inputClsSm} resize-none`} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
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

            {/* ARTICLES — gaya portal berita, artikel pertama otomatis jadi unggulan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Articles</h3>
                <AddBtn onClick={addArticle} label="Tambah Artikel" />
              </div>
              <p className="text-[10px] text-gray-400 -mt-1">
                Artikel #1 di daftar bakal tampil besar sebagai artikel unggulan di halaman publik, sisanya jadi daftar kecil di sampingnya. Urutan bisa diatur dengan menyusun ulang artikel di sini.
              </p>
              {formData.projects.articles.map((art, idx) => (
                <div
                  key={art.id || idx}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop('articles', idx)}
                  className={`p-4 bg-gray-50 dark:bg-[#2d2d2d] rounded border border-gray-200 dark:border-gray-700 space-y-2 transition-opacity ${
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
              ))}
            </div>

            {/* GALLERY — Poster & Photo, konsepnya sama (gambar + keterangan) */}
            <GallerySection type="poster" label="Gallery — Poster" items={formData.projects.gallery.poster} />
            <GallerySection type="photo" label="Gallery — Photo" items={formData.projects.gallery.photo} />
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= PATROL ================= */}
        {activeTab === 'patrol' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold border-b pb-2 border-gray-100 dark:border-gray-800 text-blue-600 dark:text-blue-400">Tab Patrol</h2>
            <p className="text-xs text-gray-500 italic">
              Kotak guidance/hint putih yang diem di tempat (gak jalan/loop) di pojok
              kiri-bawah luar kertas — cuma di desktop. Isinya beda-beda tergantung tab
              publik yang lagi dibuka pengunjung. Kosongin salah satu kotak di bawah kalau
              gak mau guidance-nya nongol di tab itu.
            </p>

            <Field label="Judul Kotak">
              <input
                type="text"
                value={formData.patrol.heading}
                onChange={(e) => setPatrol('heading', e.target.value)}
                placeholder="Guidance / Hint"
                className={inputCls}
              />
            </Field>

            {PATROL_TABS.map((tab) => (
              <Field key={tab} label={`Guidance buat Tab ${tab}`}>
                <textarea
                  rows={3}
                  value={formData.patrol[tab]}
                  onChange={(e) => setPatrol(tab, e.target.value)}
                  placeholder={`Contoh: petunjuk singkat buat pengunjung yang lagi di tab ${tab}...`}
                  className={`${inputCls} resize-y`}
                />
              </Field>
            ))}
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