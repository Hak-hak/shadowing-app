import React, { useState } from 'react';
import { BookOpen, PlusCircle, UserCheck, Database, Volume2, GraduationCap, Settings2 } from 'lucide-react';
import { UserProfile } from '../services/storage';

interface NavbarProps {
  activeTab: 'lesson' | 'library' | 'create' | 'profile';
  setActiveTab: (tab: 'lesson' | 'library' | 'create' | 'profile') => void;
  currentUser: UserProfile;
  onToggleRole: () => void;
  onOpenFirebaseGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onToggleRole,
  onOpenFirebaseGuide,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('lesson')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-none block">
              English Speaking Practice
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 hidden sm:block mt-0.5">
              Listen • Read • Repeat • Shadowing
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            id="nav-tab-lesson"
            onClick={() => setActiveTab('lesson')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'lesson'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <span className="hidden xs:inline">Luyện nói</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => setActiveTab('library')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'library'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Thư viện</span>
          </button>

          <button
            id="nav-tab-create"
            onClick={() => setActiveTab('create')}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">+ Tạo bài học</span>
            <span className="sm:hidden">+ Tạo</span>
          </button>

          <button
            id="nav-tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Tiến độ học tập"
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Tiến độ</span>
          </button>
        </nav>

        {/* User Role & More Options Menu */}
        <div className="flex items-center gap-2 relative">
          {/* Role badge button */}
          <button
            onClick={onToggleRole}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
              currentUser.role === 'teacher'
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Nhấn để đổi giữa Giáo viên và Học sinh"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{currentUser.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</span>
          </button>

          {/* Quick Menu for Technical/Extra Options */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tùy chọn khác"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-500">
                    Tùy chọn hệ thống
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenFirebaseGuide();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-amber-500" />
                    <span>Hướng dẫn lưu trữ Firebase</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleRole();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-purple-500" />
                    <span>Chuyển vai trò ({currentUser.role === 'teacher' ? 'Học sinh' : 'Giáo viên'})</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
