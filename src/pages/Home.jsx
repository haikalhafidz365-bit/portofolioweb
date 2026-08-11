import React from 'react';

export default function Home({ data, onDownloadPdf }) {
  const { name, role, bio, photoUrl } = data || {};

  return (
    <div className="w-full flex flex-col items-start justify-center text-left py-16 px-4 sm:px-8 select-text">
      
      {/* Foto Profil (Placeholder Persegi ala Dokumen CV) */}
      <div className="w-28 h-28 rounded-lg bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 mb-6 overflow-hidden shadow-sm flex items-center justify-center">
        {photoUrl ? (
          <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Foto Profil</span>
        )}
      </div>

      {/* Nama Lengkap */}
      <h1 className="text-4xl sm:text-5xl font-normal tracking-tight mb-3 text-gray-900 dark:text-white">
        {name || '[Nama Lengkap Lo]'}
      </h1>

      {/* Bio Singkat / Role */}
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed text-left">
        {role}{role && bio ? '. ' : ''}{bio}
      </p>

      {/* Tombol Download PDF — trigger dialog print bawaan browser, tinggal pilih "Save as PDF" */}
      {onDownloadPdf && (
        <button
          type="button"
          onClick={onDownloadPdf}
          className="mt-6 inline-flex items-center gap-2 text-xs font-mono border border-gray-300 dark:border-gray-700 px-4 py-2 rounded hover:border-[#2B579A] dark:hover:border-[#6FA8DC] hover:text-[#2B579A] dark:hover:text-[#6FA8DC] text-gray-600 dark:text-gray-400 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Download PDF
        </button>
      )}

    </div>
  );
}