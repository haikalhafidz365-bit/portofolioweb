import React, { useState } from 'react';

/* Icon kecil monoline, bikin sendiri biar gak nambah dependency baru ke proyek */
const Icon = {
  Mail: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  ),
  Copy: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="m4 12 6 6L20 6" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  ),
  LinkedIn: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M6.94 8.5H4V20h2.94V8.5ZM5.47 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20 13.3c0-3.06-1.63-4.48-3.8-4.48-1.75 0-2.53.96-2.97 1.64V8.5H10.3c.04.86 0 11.5 0 11.5h2.93v-6.42c0-.34.02-.69.12-.94.28-.69.9-1.4 1.96-1.4 1.38 0 1.94 1.05 1.94 2.59V20H20v-6.7Z" />
    </svg>
  ),
  GitHub: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  ),
  Instagram: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M4 4h4.4l4 5.6L17 4h3l-6.3 8.1L20.4 20H16l-4.3-6-5 6H4l6.7-8.4L4 4Z" />
    </svg>
  ),
};

const SOCIAL_ICON = {
  linkedin: Icon.LinkedIn,
  github: Icon.GitHub,
  instagram: Icon.Instagram,
  'x / twitter': Icon.X,
  twitter: Icon.X,
};

// Jaring pengaman: kalau suatu saat isi CMS masih nyisipin emoji di label tombol,
// dibersihin di sini biar tampilannya tetep rapi.
function stripTrailingEmoji(str = '') {
  return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '').trim();
}

// Field "location" di CMS masih 1 kolom teks gabungan, mis. "Jakarta, Indonesia (Available for Remote)".
// Dipecah di sini jadi lokasi utama + status ketersediaan (kalau ada), tanpa perlu ubah skema CMS.
function splitLocation(raw = '') {
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { location: match[1].trim(), availability: match[2].trim() };
  return { location: raw.trim(), availability: null };
}

const FALLBACK = {
  heading: "Let's work together or just say hi.",
  subheading: '',
  email: '',
  location: '',
  closingText: '',
  collabButtonText: '',
  collabButtonUrl: '#',
  socials: [],
  actionButtons: [],
};

export default function Contact({ data }) {
  // Selalu utamakan data dari CMS (props). FALLBACK cuma jaring pengaman kalau
  // props-nya belum ada / ada field yang kosong dari Supabase, biar gak crash.
  const contactInfo = { ...FALLBACK, ...data };
  const { location, availability } = splitLocation(contactInfo.location);

  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactInfo.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard gak tersedia (mis. non-https lokal) — diamkan, email tetap terbaca */
    }
  };

  return (
    <div className="w-full text-gray-900 dark:text-gray-100 select-text py-2 space-y-5">

      {/* Konten Kontak — blok-nya di-center di halaman, tapi isi teksnya tetep rata kiri */}
      <div className="max-w-xl mx-auto">

        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white leading-snug tracking-tight">
          {contactInfo.heading}
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
          {contactInfo.subheading}
        </p>

        {/* Email & Lokasi — daftar tenang, tanpa kotak berwarna */}
        <div className="mt-6 divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handleCopyEmail}
            className="w-full flex items-center justify-between gap-3 py-3 text-left group"
          >
            <span className="flex items-center gap-2.5 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <Icon.Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
              {contactInfo.email}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors shrink-0">
              {copied ? (
                <>
                  <Icon.Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Icon.Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </span>
          </button>

          <div className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2.5 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <Icon.Pin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
              {location}
            </span>
            {availability && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {availability}
              </span>
            )}
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {contactInfo.actionButtons.map((btn, index) => (
            <a
              key={index}
              href={btn.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 px-5 py-2.5 text-sm font-semibold rounded-md text-center transition-colors ${
                btn.primary
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {stripTrailingEmoji(btn.label)}
            </a>
          ))}
        </div>

        {/* Sosial Media — icon-only, tenang */}
        <div className="mt-7 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {contactInfo.socials.map((soc, idx) => {
              const SocIcon = SOCIAL_ICON[soc.name.toLowerCase()] || Icon.Arrow;
              return (
                <a
                  key={idx}
                  href={soc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={soc.label}
                  aria-label={soc.label}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-600 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  <SocIcon className="w-4 h-4" />
                </a>
              );
            })}
          </div>

          {contactInfo.collabButtonText && (
            <a
              href={contactInfo.collabButtonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {contactInfo.collabButtonText}
              <Icon.Arrow className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {contactInfo.closingText && (
          <p className="text-sm text-gray-900 dark:text-white italic mt-3">
            {contactInfo.closingText}
          </p>
        )}
      </div>

    </div>
  );
}