import React, { useState, useEffect } from 'react';
import { User, Award, CheckCircle2, BookmarkCheck, Clock, BookOpen, UserCheck, Shield, Sparkles } from 'lucide-react';
import { Lesson, UserProgress } from '../types';
import { storageService, UserProfile } from '../services/storage';

interface ProgressProfileProps {
  onSelectLesson: (lesson: Lesson) => void;
  onRoleChanged: () => void;
}

export const ProgressProfile: React.FC<ProgressProfileProps> = ({ onSelectLesson, onRoleChanged }) => {
  const [user, setUser] = useState<UserProfile>(storageService.getUser());
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [allProgress, setAllProgress] = useState<Record<string, UserProgress>>({});
  const [nameInput, setNameInput] = useState(user.name);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setAllLessons(storageService.getAllLessons());
    setAllProgress(storageService.getAllProgress());
    setUser(storageService.getUser());
    setNameInput(storageService.getUser().name);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      name: nameInput.trim() || user.name,
    };
    storageService.setUser(updated);
    setUser(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRoleToggle = (newRole: 'teacher' | 'student') => {
    const updated: UserProfile = { ...user, role: newRole };
    storageService.setUser(updated);
    setUser(updated);
    onRoleChanged();
  };

  // Calculate overall stats
  let totalPractices = 0;
  let totalCompletedSentences = 0;
  const progressList = Object.values(allProgress);

  progressList.forEach((p) => {
    totalPractices += p.practiceCount || 0;
    totalCompletedSentences += p.completedSentences ? p.completedSentences.length : 0;
  });

  return (
    <div id="profile-progress-screen" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* User Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {user.name.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {user.name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  user.role === 'teacher'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {user.role === 'teacher' ? 'Giáo viên (Teacher)' : 'Học sinh (Student)'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Khối lớp: <span className="font-semibold text-slate-700">{user.grade || 'Lớp 7'}</span> • Phương pháp Listen - Read - Repeat - Shadowing
            </p>
          </div>
        </div>

        {/* Role toggle */}
        <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Chuyển đổi vai trò người dùng:
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleRoleToggle('student')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                user.role === 'student'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Học sinh (Luyện nói)
            </button>
            <button
              onClick={() => handleRoleToggle('teacher')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                user.role === 'teacher'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Giáo viên (Tạo & Quản lý bài)
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Tổng câu đã luyện
            </span>
            <span className="text-2xl font-black text-slate-900">
              {totalCompletedSentences}
            </span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Lượt nói (Practice)
            </span>
            <span className="text-2xl font-black text-slate-900">
              {totalPractices}
            </span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Bài học đang theo học
            </span>
            <span className="text-2xl font-black text-slate-900">
              {progressList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Progress per lesson */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <span>Tiến Độ Từng Bài Học</span>
        </h3>

        <div className="space-y-3">
          {allLessons.map((lesson) => {
            const prog = allProgress[lesson.id];
            const completedCount = prog?.completedSentences?.length || 0;
            const totalCount = lesson.sentences.length;
            const percent = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

            return (
              <div
                key={lesson.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{lesson.title}</span>
                    <span className="text-[11px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border">
                      {lesson.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {completedCount} / {totalCount} câu ({percent}%)
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectLesson(lesson)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 font-bold text-xs shadow-2xs transition-colors shrink-0"
                >
                  {percent === 0 ? 'Bắt đầu học' : 'Học tiếp tục'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
