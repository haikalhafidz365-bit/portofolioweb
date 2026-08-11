import React from 'react';

// ====================================================================================
// KOMPONEN KHUSUS BUAT PRINT / DOWNLOAD PDF.
//
// Kenapa perlu komponen terpisah? Karena tampilan normal web ini isinya banyak yang
// "ketutup di balik klik" (accordion About, menu-pilih-kategori di Career, rak-geser
// di Book) — kalau di-print apa adanya, hasil PDF-nya bakal banyak bolong/kosong.
// Di sini SEMUA data dibentang penuh & statis, gak ada state/klik sama sekali,
// khusus buat dibaca di atas kertas.
//
// Komponen ini SELALU ada di DOM (lewat App.jsx) tapi disembunyiin total di layar
// (class "hidden print:block") — cuma nongol pas mode print/PDF aktif. Tampilan
// normal sehari-hari sama sekali gak keganggu.
// ====================================================================================

function Section({ title, children, breakAfter = true }) {
  return (
    <section className={`px-10 py-12 ${breakAfter ? 'break-after-page' : ''}`}>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8 pb-3 border-b-2 border-gray-900">
        {title}
      </h1>
      {children}
    </section>
  );
}

export default function PrintPortfolio({ data }) {
  const d = data || {};
  const home = d.home || {};
  const about = d.about || {};
  const career = d.career || {};
  const books = d.books || {};
  const projects = d.projects || {};
  const contact = d.contact || {};

  const careerCategories = [
    { key: 'professional', label: 'Professional' },
    { key: 'college', label: 'College' },
    { key: 'school', label: 'School' },
  ];

  // Field About bisa berupa array (list poin) atau string biasa — dua-duanya ditangani.
  const renderAboutContent = (value) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return <p className="text-gray-400 italic">Belum ada cerita di sini.</p>;
      return (
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-gray-700">
          {value.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      );
    }
    return <p className="text-gray-700 leading-relaxed whitespace-pre-line">{value || 'Belum ada cerita di sini.'}</p>;
  };

  return (
    <div className="hidden print:block text-gray-900 bg-white" style={{ fontFamily: 'Georgia, serif' }}>

      {/* ======================= HALAMAN 1: HOME ======================= */}
      <Section title="Home">
        <div className="flex items-start gap-6">
          {home.photoUrl && (
            <img src={home.photoUrl} alt={home.name} className="w-28 h-28 rounded-lg object-cover border border-gray-300" />
          )}
          <div>
            <h2 className="text-4xl font-bold mb-2">{home.name || '[Nama Lengkap]'}</h2>
            <p className="text-gray-600 leading-relaxed max-w-xl">
              {home.role}{home.role && home.bio ? '. ' : ''}{home.bio}
            </p>
          </div>
        </div>
      </Section>

      {/* ======================= HALAMAN 2: ABOUT ======================= */}
      <Section title="About">
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Live</h3>
            {renderAboutContent(about.live)}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Life</h3>
            {renderAboutContent(about.life)}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Laugh</h3>
            {renderAboutContent(about.laugh)}
          </div>
        </div>
      </Section>

      {/* ======================= HALAMAN 3: CAREER (semua kategori dibentang) ======================= */}
      <Section title={career.heading || 'Career & Education'}>
        {career.subheading && <p className="text-gray-500 text-sm mb-6 -mt-4">{career.subheading}</p>}
        <div className="space-y-8">
          {careerCategories.map(({ key, label }) => {
            const items = career[key]?.items || [];
            return (
              <div key={key}>
                <h3 className="text-lg font-bold text-gray-900 mb-3 pb-1 border-b border-gray-300">{label}</h3>
                {items.length === 0 && <p className="text-gray-400 italic text-sm">Belum ada riwayat.</p>}
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={item.id || idx} className="flex gap-4">
                      <div className="w-28 shrink-0 text-xs font-mono text-gray-400 pt-0.5">{item.period}</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.role}</p>
                        <p className="text-sm text-gray-600">
                          {item.company}
                          {item.companyInfo?.address ? ` — ${item.companyInfo.address}` : ''}
                        </p>
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ======================= HALAMAN 4: BOOKS (semua karya di-list) ======================= */}
      <Section title={books.heading || 'Books, Writings & Open Source'}>
        {books.subheading && <p className="text-gray-500 text-sm mb-6 -mt-4">{books.subheading}</p>}
        <div className="space-y-8">
          {(books.items || []).length === 0 && <p className="text-gray-400 italic text-sm">Belum ada karya.</p>}
          {(books.items || []).map((book, idx) => (
            <div key={book.id || idx} className="flex gap-5">
              {book.coverImage && (
                <img src={book.coverImage} alt={book.title} className="w-20 h-28 object-cover border border-gray-300 shrink-0" />
              )}
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500">{book.category}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{book.title}</p>
                <p className="text-sm text-gray-700 leading-relaxed mt-1.5">{book.fullDescription || book.summary}</p>
                {book.actionUrl && (
                  <p className="text-xs text-gray-500 mt-1.5">{book.actionText}: {book.actionUrl}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ======================= HALAMAN 5: PROJECTS ======================= */}
      <Section title="Projects">
        <div className="space-y-8">
          {(projects.articles || []).length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Articles</h3>
              <div className="space-y-5">
                {projects.articles.map((art, idx) => (
                  <div key={art.id || idx}>
                    <p className="text-xs font-mono text-gray-400">{art.date} · {art.category}</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">{art.title}</p>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{art.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(projects.posters || []).length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Posters / Visual Works</h3>
              <div className="grid grid-cols-2 gap-5">
                {projects.posters.map((p, idx) => (
                  <div key={p.id || idx}>
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.title} className="w-full h-32 object-cover border border-gray-300 mb-1.5" />
                    )}
                    <p className="text-sm font-bold text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                    <p className="text-xs text-gray-600 mt-1">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ======================= HALAMAN 6: CONTACT (halaman terakhir, gak perlu page-break lagi) ======================= */}
      <Section title="Contact" breakAfter={false}>
        <h2 className="text-xl font-semibold mb-1">{contact.heading}</h2>
        <p className="text-gray-500 mb-6">{contact.subheading}</p>
        <div className="space-y-1.5 text-sm text-gray-700">
          {contact.email && <p>Email: {contact.email}</p>}
          {contact.location && <p>Lokasi: {contact.location}</p>}
        </div>
        {(contact.socials || []).length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            {contact.socials.map((s, i) => (
              <span key={i}>{s.name}: {s.url}{i < contact.socials.length - 1 ? '  ·  ' : ''}</span>
            ))}
          </div>
        )}
        {contact.closingText && (
          <p className="text-sm italic text-gray-900 mt-6">{contact.closingText}</p>
        )}
      </Section>

    </div>
  );
}