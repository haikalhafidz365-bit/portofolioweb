import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';

// KHUSUS TAB HOME. Kolom kiri diisi TERUS dari atas sampe beneran mentok
// tinggi kontainer, baru SISANYA lempar ke kolom kanan — bukan asal bagi
// rata 50/50 by jumlah kalimat.
//
// Kenapa gak pake CSS `columns` + `column-fill: auto` aja (yang harusnya
// ini persis fiturnya)? Karena Chrome punya bug lama (crbug.com/546564):
// `column-fill: auto` gak pernah beneran dihormatin di layar biasa, dia
// tetep maksa "balance" (nyeimbangin tinggi kedua kolom) walau udah
// eksplisit di-set auto. Firefox/Safari bener, Chrome kagak — dan target
// utama proyek ini kemungkinan besar dibuka di Chrome. Makanya di sini
// pemisahan kolom dihitung manual pake JS: ukur tinggi tiap kalimat
// (pake elemen ukur tersembunyi di luar layar), tumpuk tingginya
// satu-satu, begitu total tingginya bakal ngelewatin tinggi kontainer —
// itu jadi titik potong buat pindah ke kolom kanan.
//
// Semakin ke kiri (semakin deket ke foto/nama/bio), teksnya semakin
// FADE OUT lewat CSS mask gradient. Kapan komponen ini muncul (cuma tab
// Home) diatur di App.jsx.
export default function WatermarkBackground({ odds }) {
  const items = useMemo(() => {
    return (odds || []).map((s) => s.trim()).filter(Boolean);
  }, [odds]);

  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [splitIndex, setSplitIndex] = useState(() => Math.ceil(items.length / 2));

  useLayoutEffect(() => {
    if (items.length === 0) return;

    // Jumlahin offsetTop dari `el` naik terus ke atas (lewat rantai offsetParent)
    // sampe mentok akar dokumen, buat dapetin posisi vertikal "absolut" dalam unit
    // LAYOUT asli (bukan getBoundingClientRect, yang hasilnya ngikut skala visual
    // pas kena CSS transform: scale — bakal gak nyambung kalau dibandingin sama
    // offsetHeight yang selalu di unit layout asli/gak ke-scale).
    //
    // Awalnya cara ini nyari elemen nama cuma di dalem `container.offsetParent`
    // doang (asumsinya container & nama satu wrapper positioned yang sama) — TERNYATA
    // SALAH: `offsetParent` si container watermark itu cuma div pembungkusnya sendiri
    // (`absolute inset-0` satu level di atasnya), bukan wrapper besar tempat nama juga
    // ada. Akibatnya elemen nama gak pernah ketemu, diem-diem fallback ke logic lama
    // (isi kolom kiri penuh) tanpa keliatan errornya. Sekarang gak butuh "ancestor yang
    // sama" — tinggal jumlahin ke akar terus dikurangin, jadi valid berapa pun lapis
    // div positioned di antara container sama elemen nama.
    const getAbsoluteTop = (el) => {
      let top = 0;
      let node = el;
      while (node) {
        top += node.offsetTop;
        node = node.offsetParent;
      }
      return top;
    };

    const recalculate = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;

      // Lebar 1 kolom ngikutin lebar kontainer beneran (dibagi 2, dikurangin gap),
      // biar wrapping kata di elemen ukur sama persis kayak yang bakal tampil.
      const GAP_PX = 16; // samain sama gap-4 di className bawah
      const colWidth = Math.max(0, (container.clientWidth - GAP_PX) / 2);
      measure.style.width = `${colWidth}px`;

      const availableHeight = container.clientHeight;

      // Batas tinggi KHUSUS buat kolom kiri: sejajar sama batas bawah nama
      // (`[data-watermark-name-anchor]` di Home.jsx), BUKAN tinggi kontainer penuh
      // kayak sebelumnya. Begitu ngelewatin batas ini, sisa kalimat langsung lempar
      // ke kolom kanan (yang tetep boleh make tinggi kontainer penuh) — jadi kolom
      // kiri berhenti pas level sama nama, gak lanjut turun nutupin bio di bawahnya.
      // Nyari elemen nama-nya pake `document.querySelector` global (bukan dibatasin
      // ke subtree ancestor tertentu) — lihat catatan getAbsoluteTop di atas kenapa.
      // Kalau anchor-nya gak ketemu sama sekali (mis. dipanggil di luar tab Home),
      // fallback ke tinggi kontainer penuh kayak logic lama.
      let leftColumnHeight = availableHeight;
      const nameAnchor = document.querySelector('[data-watermark-name-anchor]');
      if (nameAnchor) {
        const nameBottom = getAbsoluteTop(nameAnchor) + nameAnchor.offsetHeight;
        const containerTop = getAbsoluteTop(container);
        leftColumnHeight = Math.max(0, nameBottom - containerTop);
      }

      const paragraphs = Array.from(measure.children);

      let cumulative = 0;
      let idx = paragraphs.length; // default: semua muat di kolom kiri
      for (let i = 0; i < paragraphs.length; i++) {
        cumulative += paragraphs[i].offsetHeight;
        if (cumulative > leftColumnHeight) {
          idx = i; // kalimat ke-i ini yang bikin ngelewatin batas nama → pindah kolom dari sini
          break;
        }
      }
      setSplitIndex(Math.max(0, Math.min(idx, items.length)));
    };

    recalculate();

    // Ukur ulang kalau kontainer berubah ukuran (resize window, toggle admin
    // mode, ganti zoom, dll) — pake ResizeObserver biar lebih akurat daripada
    // cuma dengerin window resize.
    const ro = new ResizeObserver(recalculate);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const leftColumn = items.slice(0, splitIndex);
  const rightColumn = items.slice(splitIndex);

  // Mask horizontal: transparan di ujung kiri blok (paling deket konten asli),
  // pelan-pelan solid pas udah agak ke tengah/kanan blok.
  const fadeMask = 'linear-gradient(to right, transparent 0%, black 45%)';

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* Disembunyiin di HP — ruang kosongnya udah kepake full sama konten Home di sana. */}
      <div
        ref={containerRef}
        className="hidden sm:flex absolute items-start gap-4 text-justify font-serif italic text-gray-800 dark:text-gray-200"
        style={{
          top: '2%',
          bottom: '2%',
          left: '40%',
          right: '3%',
          fontSize: '8pt',
          lineHeight: 1.4,
          opacity: 0.4,
          WebkitMaskImage: fadeMask,
          maskImage: fadeMask,
          overflow: 'hidden',
        }}
      >
        {/* Kolom kiri: DIISI PENUH dulu sampe mentok tinggi kontainer */}
        <div className="flex-1">
          {leftColumn.map((text, i) => (
            <p key={i} className="mb-1.5">{text}</p>
          ))}
        </div>
        {/* Kolom kanan: baru nampung sisa kalimat yang gak muat di kolom kiri */}
        <div className="flex-1">
          {rightColumn.map((text, i) => (
            <p key={i} className="mb-1.5">{text}</p>
          ))}
        </div>

        {/* Elemen UKUR — nggak keliatan (visibility: hidden, dilempar di luar
            layar), isinya SEMUA kalimat ditumpuk dalam 1 kolom, dipakai cuma
            buat ngukur tinggi tiap paragraf via offsetHeight di JS di atas. */}
        <div
          ref={measureRef}
          style={{
            position: 'fixed',
            top: 0,
            left: -9999,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {items.map((text, i) => (
            <p key={i} className="mb-1.5">{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}