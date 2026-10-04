import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Volume2, Share2, Check, Sparkles, Filter, Trash2, GraduationCap } from 'lucide-react';
import { Lesson } from '../types';
import { storageService } from '../services/storage';

interface LessonLibraryProps {
  onSelectLesson: (lesson: Lesson) => void;
  onCreateNew: () => void;
}

const GRADES = ['All', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'];

export const LessonLibrary: React.FC<LessonLibraryProps> = ({ onSelectLesson, onCreateNew }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentUser = storageService.getUser();

  const refreshLessons = () => {
    const list = storageService.searchLessons(searchQuery, selectedGrade);
    setLessons(list);
  };

  useEffect(() => {
    refreshLessons();
  }, [searchQuery, selectedGrade]);

  const handleCopyCode = (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    const url = `${window.location.origin}?lesson=${lesson.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(lesson.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLesson = (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa bài học này không?')) {
      storageService.deleteLesson(lessonId);
      refreshLessons();
    }
  };

  return (
    <div id="lesson-library-screen" className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Thư viện cộng đồng
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Thư Viện Bài Học Luyện Nói
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tìm kiếm bài học theo khối lớp THCS, chủ đề giao tiếp hoặc nhập mã bài học (Share Code)
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Tạo bài học mới</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-lessons"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài, chủ đề, hoặc mã chia sẻ (vd: EN-8A3F2)..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
          />
        </div>

        {/* Grade filter tabs */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                selectedGrade === g
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {g === 'All' ? 'Tất cả lớp' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.length > 0 ? (
          lessons.map((lesson) => {
            const canDelete =
              currentUser.role === 'teacher' || lesson.createdBy.includes(currentUser.name);

            return (
              <div
                key={lesson.id}
                id={`lesson-card-${lesson.id}`}
                onClick={() => onSelectLesson(lesson)}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between gap-4 cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {lesson.grade && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {lesson.grade}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {lesson.topic}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                      {lesson.id}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {lesson.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    Tác giả: <span className="font-semibold text-slate-700">{lesson.createdBy}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {lesson.sentences.length} câu giao tiếp
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleCopyCode(e, lesson)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Sao chép link chia sẻ"
                    >
                      {copiedId === lesson.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>

                    {canDelete && (
                      <button
                        onClick={(e) => handleDeleteLesson(e, lesson.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa bài học này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Bắt đầu học</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">
              Không tìm thấy bài học phù hợp
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút bên dưới để tạo bài học luyện nói mới ngay lập tức!
            </p>
            <button
              onClick={onCreateNew}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
            >
              + Tạo bài học ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
