import React from 'react';

// Framing foto (object-position) — dipatok di area mata LO YANG ASLI
// (dihitung dari foto yang lo kirim: mata ada di sekitar 43-44% dari atas
// foto, center horizontal). Kalau nanti ganti foto lain dengan proporsi
// beda jauh, tinggal sesuaiin lagi angka persennya di sini.
const DEFAULT_OBJECT_POSITION = '50% 46%';

export default function Home({ data }) {
  const { name, role, bio, photoUrl, photoUrlDark } = data || {};

  // `photoUrl` = versi buat LIGHT mode (B&W, background terang, lighting di
  // muka udah baked-in di file fotonya sendiri — bukan hasil filter CSS).
  // `photoUrlDark` = versi buat DARK mode (warna asli, background gelap,
  // lighting di muka juga udah baked-in). Kalau `photoUrlDark` belum diisi
  // di CMS, sementara fallback ke `photoUrl` yang sama biar gak kosong.
  const lightPhoto = photoUrl;
  const darkPhoto = photoUrlDark || photoUrl;

  return (
    <div className="w-full flex flex-col items-start justify-center text-left py-16 px-4 sm:px-8 select-text">

      {/* Foto Profil — statis, gak ngikutin mouse. Dua file foto beda yang
          di-swap sesuai mode (bukan 1 foto + CSS grayscale/gradient),
          jadi background & lighting-nya persis sama kayak yang udah
          di-edit di file aslinya, gak ada efek bocor/aneh. */}
      <div className="w-28 h-28 rounded-full bg-white dark:bg-[#202020] mb-6 overflow-hidden flex items-center justify-center relative">
        {lightPhoto ? (
          <>
            <img
              src={lightPhoto}
              alt="Profil"
              className="w-full h-full object-cover block dark:hidden"
              style={{ objectPosition: DEFAULT_OBJECT_POSITION }}
            />
            <img
              src={darkPhoto}
              alt="Profil"
              className="w-full h-full object-cover hidden dark:block"
              style={{ objectPosition: DEFAULT_OBJECT_POSITION }}
            />
          </>
        ) : (
          <span className="text-[0.75em] text-gray-400 dark:text-gray-500 font-mono">Foto Profil</span>
        )}
      </div>

      {/* Nama Lengkap */}
      {/* `data-watermark-name-anchor`: dipakai WatermarkBackground.jsx buat ngukur
          sampe mana batas bawah nama ini (posisinya, BUKAN isinya) — biar kolom kiri
          watermark berhenti ngisi pas sejajar sini, gak lanjut turun nutupin bio. */}
      <h1
        data-watermark-name-anchor="true"
        className="text-[2.25em] sm:text-[3em] font-normal tracking-tight mb-3 text-gray-900 dark:text-white"
      >
        {name || '[Nama Lengkap Lo]'}
      </h1>

      {/* Bio Singkat / Role */}
      {/* Lebar bio SENGAJA dibatasin pake PERSENTASE (bukan max-w-sm/xl fixed), dihitung
          dari struktur CSS kertas: watermark mulai di 60% dari tepi kertas (lihat
          WatermarkBackground.jsx), sedangkan bio ini mulai agak masuk dari tepi kertas
          (kena padding kertas p-8 + padding Home sendiri px-4/px-8).
          Sebelumnya dipasang 36% — ternyata KETERLALUAN sempit, kolomnya jadi cuma
          muat dikit kata per baris dan bikin text-justify maksa renggangin spasi
          antar kata (jadi jelek, kayak river gap). Sekarang dilebarin ke 55% biar
          bacaannya normal (mirip tampilan lama), dan sebagai gantinya titik mulai
          watermark DIMUNDURIN ke 60% (dari yang tadinya 40%) biar tetep ada jarak
          aman ~5% dari lebar Home di antara ujung kanan bio & awal watermark —
          gak ketimpa lagi. Kedua angka ini (55% di sini & 60% di
          WatermarkBackground.jsx) SALING PASANGAN: kalau salah satu diubah, angka
          satunya juga musti disesuaiin biar jaraknya tetep aman. Tetep proporsional
          (bukan angka px tetap) biar aman walau kertas resize/zoom berubah. */}
      <p className="text-[0.875em] sm:text-[1em] text-gray-800 dark:text-gray-200 max-w-full sm:max-w-[55%] leading-relaxed text-justify">
        {role}{role && bio ? '. ' : ''}{bio}
      </p>

    </div>
  );
}