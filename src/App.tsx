import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LessonView } from './pages/LessonView';
import { LessonLibrary } from './pages/LessonLibrary';
import { CreateLesson } from './pages/CreateLesson';
import { ProgressProfile } from './pages/ProgressProfile';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';
import { storageService, UserProfile } from './services/storage';
import { Lesson } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'lesson' | 'library' | 'create' | 'profile'>('lesson');
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(storageService.getUser());
  const [isFirebaseGuideOpen, setIsFirebaseGuideOpen] = useState(false);

  // Initialize and check for URL parameters (e.g. ?lesson=EN-8A3F2)
  useEffect(() => {
    const allLessons = storageService.getAllLessons();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLessonId = urlParams.get('lesson');

      if (urlLessonId) {
        const found = storageService.getLessonById(urlLessonId);
        if (found) {
          setCurrentLesson(found);
          setActiveTab('lesson');
          return;
        }
      }
    }

    if (allLessons.length > 0) {
      setCurrentLesson(allLessons[0]);
    }
  }, []);

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setActiveTab('lesson');
    // Update URL parameter without page reload
    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.pathname}?lesson=${lesson.id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleLessonCreated = (newLesson: Lesson) => {
    setCurrentLesson(newLesson);
    setActiveTab('lesson');
    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.pathname}?lesson=${newLesson.id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleToggleRole = () => {
    const newRole = currentUser.role === 'teacher' ? 'student' : 'teacher';
    const updated: UserProfile = { ...currentUser, role: newRole };
    storageService.setUser(updated);
    setCurrentUser(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onToggleRole={handleToggleRole}
        onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {activeTab === 'lesson' && currentLesson && (
          <LessonView
            lesson={currentLesson}
            onBackToLibrary={() => setActiveTab('library')}
          />
        )}

        {activeTab === 'library' && (
          <LessonLibrary
            onSelectLesson={handleSelectLesson}
            onCreateNew={() => setActiveTab('create')}
          />
        )}

        {activeTab === 'create' && (
          <CreateLesson
            onLessonCreated={handleLessonCreated}
            onCancel={() => setActiveTab('library')}
          />
        )}

        {activeTab === 'profile' && (
          <ProgressProfile
            onSelectLesson={handleSelectLesson}
            onRoleChanged={() => setCurrentUser(storageService.getUser())}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-600">
            <strong>English Speaking Practice</strong> • Phương pháp LISTEN – READ – REPEAT – SHADOWING
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFirebaseGuideOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              Cấu hình Firebase & Backend Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Firebase Setup Guide Modal */}
      <FirebaseGuideModal
        isOpen={isFirebaseGuideOpen}
        onClose={() => setIsFirebaseGuideOpen(false)}
      />
    </div>
  );
}
