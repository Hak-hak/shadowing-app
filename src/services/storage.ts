import { Lesson, UserProgress } from '../types';
import { SAMPLE_LESSONS } from '../data/sampleLessons';
import { normalizeLesson } from '../utils/sentenceUtils';

const STORAGE_KEY_LESSONS = 'esp_lessons_v1';
const STORAGE_KEY_PROGRESS = 'esp_progress_v1';
const STORAGE_KEY_USER = 'esp_user_profile_v1';

export interface UserProfile {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  grade?: string;
}

class StorageService {
  private lessons: Lesson[] = [];
  private progress: Record<string, UserProgress> = {};
  private user: UserProfile = {
    id: 'user-default-1',
    name: 'Học sinh Lớp 7',
    role: 'student',
    grade: 'Lớp 7',
  };

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Load lessons
    const storedLessons = localStorage.getItem(STORAGE_KEY_LESSONS);
    if (storedLessons) {
      try {
        const parsed = JSON.parse(storedLessons);
        this.lessons = Array.isArray(parsed)
          ? parsed.map((l: Lesson) => normalizeLesson(l))
          : SAMPLE_LESSONS.map((l) => normalizeLesson(l));
        // Ensure updated translations are preserved
        this.saveLessons();
      } catch (e) {
        this.lessons = SAMPLE_LESSONS.map((l) => normalizeLesson(l));
      }
    } else {
      this.lessons = SAMPLE_LESSONS.map((l) => normalizeLesson(l));
      this.saveLessons();
    }

    // Load progress
    const storedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (storedProgress) {
      try {
        this.progress = JSON.parse(storedProgress);
      } catch (e) {
        this.progress = {};
      }
    }

    // Load user profile
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch (e) {
        // default
      }
    }
  }

  private saveLessons() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(this.lessons));
    }
  }

  private saveProgress() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(this.progress));
    }
  }

  public getUser(): UserProfile {
    return this.user;
  }

  public setUser(user: UserProfile) {
    this.user = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  }

  public getAllLessons(): Lesson[] {
    return this.lessons;
  }

  public getLessonById(id: string): Lesson | undefined {
    const cleaned = id.trim().toUpperCase();
    return this.lessons.find(
      (l) => l.id.toUpperCase() === cleaned || l.id.toUpperCase().endsWith(cleaned)
    );
  }

  public searchLessons(query: string, gradeFilter?: string, topicFilter?: string): Lesson[] {
    const q = query.trim().toLowerCase();
    return this.lessons.filter((l) => {
      const matchesQuery =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.createdBy.toLowerCase().includes(q);

      const matchesGrade = !gradeFilter || gradeFilter === 'All' || l.grade === gradeFilter;
      const matchesTopic = !topicFilter || topicFilter === 'All' || l.topic === topicFilter;

      return matchesQuery && matchesGrade && matchesTopic;
    });
  }

  public addLesson(lesson: Omit<Lesson, 'id' | 'createdAt' | 'viewsCount' | 'practiceCount'>): Lesson {
    // Generate distinct Share Code: EN-XXXXX
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newId = `EN-${randomHex}`;

    const rawLesson: Lesson = {
      ...lesson,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      viewsCount: 1,
      practiceCount: 0,
    };

    const newLesson = normalizeLesson(rawLesson);
    this.lessons.unshift(newLesson);
    this.saveLessons();
    return newLesson;
  }

  public updateLesson(id: string, updates: Partial<Lesson>): boolean {
    const idx = this.lessons.findIndex((l) => l.id === id);
    if (idx === -1) return false;

    this.lessons[idx] = { ...this.lessons[idx], ...updates };
    this.saveLessons();
    return true;
  }

  public deleteLesson(id: string): boolean {
    const initialLen = this.lessons.length;
    this.lessons = this.lessons.filter((l) => l.id !== id);
    if (this.lessons.length !== initialLen) {
      this.saveLessons();
      return true;
    }
    return false;
  }

  public recordPractice(lessonId: string, sentenceId: number) {
    const lesson = this.getLessonById(lessonId);
    if (lesson) {
      lesson.practiceCount = (lesson.practiceCount || 0) + 1;
      this.saveLessons();
    }

    const currentProg = this.progress[lessonId] || {
      lessonId,
      userId: this.user.id,
      completedSentences: [],
      lastSentenceId: sentenceId,
      practiceCount: 0,
      lastStudiedAt: new Date().toISOString(),
    };

    if (!currentProg.completedSentences.includes(sentenceId)) {
      currentProg.completedSentences.push(sentenceId);
    }
    currentProg.lastSentenceId = sentenceId;
    currentProg.practiceCount += 1;
    currentProg.lastStudiedAt = new Date().toISOString();

    this.progress[lessonId] = currentProg;
    this.saveProgress();
  }

  public getProgress(lessonId: string): UserProgress | undefined {
    return this.progress[lessonId];
  }

  public getAllProgress(): Record<string, UserProgress> {
    return this.progress;
  }

  public toggleBookmark(lessonId: string): boolean {
    const currentProg = this.progress[lessonId] || {
      lessonId,
      userId: this.user.id,
      completedSentences: [],
      lastSentenceId: 1,
      practiceCount: 0,
      lastStudiedAt: new Date().toISOString(),
      favorite: false,
    };

    currentProg.favorite = !currentProg.favorite;
    this.progress[lessonId] = currentProg;
    this.saveProgress();
    return currentProg.favorite;
  }

  public isBookmarked(lessonId: string): boolean {
    return Boolean(this.progress[lessonId]?.favorite);
  }
}

export const storageService = new StorageService();
