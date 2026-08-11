// src/data/cmsData.js

export const initialPortfolioData = {
  // 1. HOME DATA
  home: {
    name: "[Nama Lengkap Lo]",
    role: "Frontend Developer & Tech Enthusiast",
    bio: "Berfokus pada pembuatan antarmuka digital yang bersih, fungsional, dan interaktif.",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
  },

  // 2. ABOUT DATA
  about: {
    live: "Menetap di Jakarta. Aktif mengeksplorasi teknologi web modern, merancang sistem antarmuka yang bersih, dan menikmati proses ngoding setiap hari.",
    life: "Percaya bahwa konsistensi jauh lebih penting daripada motivasi sesaat. Menikmati secangkir kopi hangat sambil mendengarkan musik ambient saat menyusun kode. Suka membaca buku literatur teknologi dan esai di waktu luang.",
    laugh: "Sering duga-duga bug hilang sendiri setelah di-refresh berkali-kali. Definisi 'sebentar lagi selesai' bagi seorang programmer bisa berarti 3 jam kemudian. Lebih panik pas ketiadaan internet daripada pas dompet lagi tipis."
  },

  // 3. CAREER DATA (Diselaraskan jadi 3 tab: school, college, professional)
  // Tiap kategori sekarang punya:
  //  - bgImage: gambar latar buat kartu menu ala game-menu di halaman Career (kosongkan
  //    biar dia pakai gradasi warna default, isi lewat CMS/upload galeri kalau mau custom)
  //  - items: daftar riwayat di kategori itu (bisa berapa aja, tambah/hapus lewat CMS)
  career: {
    // Judul & sub-judul di layar menu utama halaman Career (bisa diedit lewat CMS)
    heading: 'Career & Education',
    subheading: 'Pilih salah satu buat lihat perjalanannya.',
    school: {
      bgImage: '',
      items: [
        {
          id: 'sch-1',
          role: 'Siswa Jurusan IPA / Teknik Komputer',
          company: 'SMA Negeri 1 Jakarta',
          location: 'Jakarta Pusat',
          period: '2018 – 2021',
          description: 'Aktif di ekstrakurikuler komputer dan dasar-dasar pengembangan web.',
          companyInfo: {
            name: 'SMA Negeri 1 Jakarta',
            address: 'Jl. Budi Utomo No.7, Jakarta Pusat',
            photo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80',
            about: 'Sekolah menengah atas negeri dengan tradisi akademik dan ekstrakurikuler yang kuat.'
          }
        }
      ]
    },
    college: {
      bgImage: '',
      items: [
        {
          id: 'col-1',
          role: 'Mahasiswa S1 Teknik Informatika',
          company: 'Universitas Indonesia',
          location: 'Depok, Jawa Barat',
          period: '2021 – 2025',
          description: 'Fokus mendalami algoritma, rekayasa perangkat lunak, dan interaksi manusia-komputer (IMK).',
          companyInfo: {
            name: 'Universitas Indonesia',
            address: 'Kampus UI Depok, Jawa Barat',
            photo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
            about: 'Institusi pendidikan tinggi terkemuka di Indonesia yang mencetak talenta-talenta unggul di bidang riset dan teknologi.'
          }
        }
      ]
    },
    professional: {
      bgImage: '',
      items: [
        {
          id: 'prof-1',
          role: 'Frontend Developer & UI Engineer',
          company: 'PT Teknologi Kreatif Nusantara',
          location: 'Jakarta Selatan',
          period: 'Januari 2024 – Present',
          description: 'Bertanggung jawab membangun dan mengoptimalkan antarmuka web interaktif menggunakan React dan Tailwind CSS.',
          companyInfo: {
            name: 'PT Teknologi Kreatif Nusantara',
            address: 'Jl. Jend. Sudirman No. Kav. 52-53, Jakarta Selatan',
            photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
            about: 'Perusahaan teknologi yang berfokus pada inovasi produk digital, pengembangan perangkat lunak, dan solusi kreatif berbasis web.'
          }
        }
      ]
    }
  },

  // 4. BOOKS / KARYA TULIS DATA
  // heading & subheading = judul + keterangan singkat di halaman Book (bisa diedit lewat CMS)
  // items = daftar karya yang tampil di tumpukan buku. overviewImage = foto "halaman kiri"
  // yang muncul pas sampul dibuka (opsional), pageCount = jumlah halaman yang tampil di detail.
  books: {
    heading: 'Books, Writings & Open Source',
    subheading: 'Etalase publikasi, esai, dan proyek open-source buatan saya. Klik salah satu untuk melihat detail lengkapnya.',
    items: [
      {
        id: 'book-1',
        title: 'Panduan Praktis Frontend Modern 2026',
        category: 'E-Book / Tulisan',
        summary: 'Buku saku komprehensif yang membahas trik kilat membangun antarmuka web interaktif dengan React dan Tailwind CSS.',
        fullDescription: 'Buku ini ditulis berdasarkan pengalaman langsung di lapangan dalam menangani berbagai proyek web skala menengah hingga besar.',
        coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        overviewImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        pageCount: '184',
        actionText: 'Beli Buku Ini',
        actionUrl: 'https://example.com/buy-book'
      },
      {
        id: 'book-2',
        title: 'Esai: Seni Menjaga Kewarasan Saat Ngoding',
        category: 'Artikel / Esai',
        summary: 'Kumpulan catatan santai tentang suka duka menghadapi bug tengah malam dan menjaga ritme kerja yang sehat.',
        fullDescription: 'Esai reflektif bagi para pengembang agar tetap waras dan produktif di tengah ketatnya tenggat waktu proyek.',
        coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
        overviewImage: '',
        pageCount: '32',
        actionText: 'Baca Esai',
        actionUrl: 'https://example.com/read-essay'
      }
    ]
  },


  // 5. PROJECTS & WORKS DATA (Articles gaya portal berita + Gallery: Poster & Photo)
  // heading & subheading = judul + keterangan singkat di halaman Projects (bisa diedit lewat CMS)
  // articles[0] otomatis jadi artikel unggulan (tampil besar), sisanya jadi daftar kecil di sampingnya
  projects: {
    heading: 'Projects, Articles & Visuals',
    subheading: 'Kumpulan karya tulis artikel bergaya portal berita dan galeri visual pilihan.',
    articles: [
      {
        id: 'art-1',
        title: 'Membangun Arsitektur Web Modern di Era Perangkat Pintar',
        date: '12 Mei 2026',
        category: 'Teknologi & Web',
        author: '',
        snippet: 'Bagaimana cara menjaga performa situs web tetap ngebut di tengah gempuran tren desain antarmuka yang semakin kompleks.',
        content: 'Di era modern saat ini, pengguna menuntut akses informasi yang instan tanpa jeda...',
        image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80'
      }
    ],
    gallery: {
      poster: [
        {
          id: 'pos-1',
          title: 'Desain UI System Dashboard Admin',
          category: 'UI/UX Design',
          dimensions: '',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
          description: 'Eksplorasi tata letak panel kontrol modern bernuansa minimalis-clean.'
        }
      ],
      photo: []
    }
  },

  // 6. CONTACT DATA
  contact: {
    heading: "Let's work together or just say hi.",
    subheading: "Punya proyek menarik, ingin mendiskusikan ide kolaborasi, atau sekadar ingin memesan jasa profesional saya?",
    email: "halo@namadomain.com",
    location: "Jakarta, Indonesia (Available for Remote)",
    closingText: "Thank you for visiting this porto, hope you enjoy it!",
    collabButtonText: "Press this if need help or collaborate",
    collabButtonUrl: "mailto:halo@namadomain.com?subject=Collaboration Inquiry",
    socials: [
      { name: 'LinkedIn', url: 'https://linkedin.com', label: 'Connect on LinkedIn' },
      { name: 'GitHub', url: 'https://github.com', label: 'Explore Repositories' },
      { name: 'Instagram', url: 'https://instagram.com', label: 'Behind the Scenes' },
      { name: 'X / Twitter', url: 'https://twitter.com', label: 'Random Thoughts' }
    ],
    actionButtons: [
      { label: 'Booking / Hire Me Now', url: 'mailto:halo@namadomain.com?subject=Inquiry for Project', primary: true },
      { label: 'Download Resume', url: '#', primary: false }
    ]
  },

  // 7. ODDS — serpihan/cuplikan tulisan pendek yang dipakai sebagai aksen latar
  // (bertebaran halus di belakang konten, di SEMUA tab sekaligus). Diedit sekali di
  // CMS, otomatis kepake di mana-mana. Array of strings — satu string = satu serpihan.
  odds: [],

  // 8. QUOTES — kutipan-kutipan pendek yang tampil di balon komentar berjalan (nempel
  // di tepi kanan layar, jalan ke atas terus-menerus/loop). SENGAJA dipisah dari `odds`
  // di atas: odds itu buat tekstur latar yang acak & banyak, sedangkan quotes ini buat
  // kalimat yang beneran "berdiri sendiri" sebagai kutipan yang kebaca jelas. Diedit
  // sekali di CMS (tab terpisah dari Odds), otomatis kepake di semua tab. Array of
  // strings — satu string = satu kutipan.
  // 9. GENERAL — pengaturan situs secara keseluruhan (bukan punya satu halaman tertentu).
  // Baru ada 1 fitur di sini: notifikasi welcome yang nyambut pengunjung pas pertama buka web.
  general: {
    welcomeNotification: {
      enabled: true,
      title: 'Selamat datang! 👋',
      message: 'Terima kasih udah mampir ke portofolio saya. Semoga betah!',
      delaySeconds: 2,
    }
  }
};