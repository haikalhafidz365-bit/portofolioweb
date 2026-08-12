import React from 'react';

export default function Home({ data }) {
  const { name, role, bio, photoUrl } = data || {};

  return (
    <div className="w-full flex flex-col items-start justify-center text-left py-16 px-4 sm:px-8 select-text">
      
      {/* Foto Profil (Placeholder Persegi ala Dokumen CV) */}
      <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 mb-6 overflow-hidden flex items-center justify-center">
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

    </div>
  );
}