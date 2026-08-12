import React from 'react';

export default function TitleBar({
  isAdminMode, setIsAdminMode,
  darkMode, setDarkMode,
  isFullscreen, onToggleFullscreen,
  onSave,
  activeTab
}) {
  return (
    <div className="bg-[#2b579a] dark:bg-[#1e1e1e] text-white flex justify-between items-center px-2 sm:px-3 py-1.5 text-xs select-none transition-colors duration-200 border-b border-black/10">
      
      {/* BAGIAN KIRI: Quick Access Toolbar (Save, Undo, Redo - Hanya aktif di Mode Admin) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 font-semibold tracking-wide truncate">
          {/* Judul dokumen disingkat di layar sempit biar gak dorong tombol lain keluar */}
          <span className="text-white hidden sm:inline">Document1 - Word Portofolio</span>
          <span className="text-white sm:hidden">Portofolio</span>
        </div>

        {isAdminMode && (
          <div className="flex items-center gap-1 pl-2 sm:pl-3 border-l border-white/20 shrink-0">
            <button 
              onClick={onSave}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded text-[11px] transition-colors shadow-sm"
              title="Simpan Perubahan CMS"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              <span className="hidden sm:inline">Save</span>
            </button>
            <button className="p-1 hover:bg-white/10 rounded text-white/80 hover:text-white hidden sm:block" title="Undo">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4"></path></svg>
            </button>
            <button className="p-1 hover:bg-white/10 rounded text-white/80 hover:text-white hidden sm:block" title="Redo">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"></path></svg>
            </button>
          </div>
        )}
      </div>

      {/* BAGIAN KANAN: Mode Toggle & Tombol Admin Only */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Tombol Toggle Light / Dark Mode — di layar sempit cuma nampilin ikon, teksnya disembunyiin.
            data-hint-id cuma dipasang pas activeTab === 'Home' (lihat App.jsx: HintToggle & CSS
            .hint-mode-active), biar mode Hint di luar A4 sengaja dibatasin ke tab Home doang. */}
        <button 
          onClick={() => setDarkMode(!darkMode)}
          data-hint-id={activeTab === 'Home' ? 'titlebar-dark-mode' : undefined}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[11px] transition-all cursor-pointer"
        >
          {darkMode ? (
            <>
              <svg className="w-3.5 h-3.5 text-yellow-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-gray-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Tombol Toggle Full Screen — expand seluruh web (title bar, ribbon, dokumen,
            status bar) pake Fullscreen API browser (logic-nya di App.jsx, dikirim ke
            sini lewat props isFullscreen & onToggleFullscreen). Sama kayak tombol Dark
            Mode: di layar sempit cuma nampilin ikon, teksnya disembunyiin. */}
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[11px] transition-all cursor-pointer"
          title={isFullscreen ? 'Keluar dari Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v3a2 2 0 01-2 2H4M15 3v3a2 2 0 002 2h3M9 21v-3a2 2 0 00-2-2H4M15 21v-3a2 2 0 012-2h3"></path></svg>
              <span className="hidden sm:inline">Exit Full Screen</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3"></path></svg>
              <span className="hidden sm:inline">Full Screen</span>
            </>
          )}
        </button>

        {/* Pintu Masuk Admin Only */}
        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`px-2 sm:px-3 py-1 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
            isAdminMode 
              ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold shadow' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {isAdminMode ? 'Exit Admin' : 'Admin Only'}
        </button>

        {/* Tombol minimize/maximize standar windows — cuma dekorasi, disembunyiin di layar sempit biar gak numpuk */}
        <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-white/25 text-white/70">
          <span className="px-2 py-0.5 hover:bg-white/15 rounded cursor-pointer">&#8211;</span>
          <span className="px-2 py-0.5 hover:bg-white/15 rounded cursor-pointer">&#9633;</span>
          <span className="px-2 py-0.5 hover:bg-red-600 rounded cursor-pointer">&#10005;</span>
        </div>
      </div>

    </div>
  );
}