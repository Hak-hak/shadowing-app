/**
 * Firebase Firestore & Authentication Architecture & Configuration Guide
 *
 * This module provides:
 * 1. Firestore Database Schemas
 * 2. Firebase Security Rules (Role-based access for Teachers and Students)
 * 3. Step-by-step setup documentation
 */

export const FIRESTORE_DATABASE_SCHEMA = {
  collections: {
    lessons: {
      description: 'Stores English speaking lessons created by teachers and students',
      path: '/lessons/{lessonId}',
      fields: {
        id: 'string (e.g. EN-8A3F2)',
        title: 'string (e.g. Daily Activities)',
        topic: 'string (e.g. Daily Routines)',
        grade: 'string (e.g. Lớp 6, Lớp 7, Lớp 8, Lớp 9)',
        createdBy: 'string (Teacher name or userId)',
        authorRole: 'string ("teacher" | "student")',
        createdAt: 'timestamp (ISO string)',
        visibility: 'string ("public" | "private")',
        viewsCount: 'number',
        practiceCount: 'number',
        sentences: [
          {
            id: 'number (1, 2, 3...)',
            speaker: 'string ("A" | "B" | "Narrator")',
            english: 'string',
            vietnamese: 'string',
            words: [
              {
                text: 'string',
                ipa: 'string',
                meaning: 'string',
              },
            ],
          },
        ],
      },
    },
    userProgress: {
      description: 'Tracks each student practice progress, completed sentences, and favorites',
      path: '/users/{userId}/progress/{lessonId}',
      fields: {
        lessonId: 'string',
        userId: 'string',
        completedSentences: 'array of number',
        lastSentenceId: 'number',
        practiceCount: 'number',
        lastStudiedAt: 'timestamp',
        favorite: 'boolean',
      },
    },
    users: {
      description: 'User profiles and roles',
      path: '/users/{userId}',
      fields: {
        uid: 'string',
        displayName: 'string',
        email: 'string',
        role: 'string ("teacher" | "student")',
        createdAt: 'timestamp',
      },
    },
  },
};

export const FIREBASE_SECURITY_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isTeacher() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }

    function isAuthor(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // 1. Lessons Collection
    match /lessons/{lessonId} {
      // Anyone can read public lessons (students, guests, teachers)
      allow read: if resource.data.visibility == 'public' || (isAuthenticated() && resource.data.createdBy == request.auth.uid);

      // Only teachers or verified creators can create lessons
      allow create: if isAuthenticated() && (
        request.resource.data.authorRole == 'teacher' ||
        request.resource.data.createdBy == request.auth.uid
      );

      // Only the lesson creator / teacher can update or delete their own lesson
      allow update, delete: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
    }

    // 2. User Progress Collection
    match /users/{userId}/progress/{lessonId} {
      // Students can only read and write their own study progress
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }

    // 3. User Profiles
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
  }
}`;

export const FIREBASE_SETUP_GUIDE = [
  {
    step: 1,
    title: 'Tạo Firebase Project',
    desc: 'Truy cập https://console.firebase.google.com/, bấm "Add project", đặt tên (ví dụ: english-speaking-practice).',
  },
  {
    step: 2,
    title: 'Bật Firestore Database',
    desc: 'Vào mục "Build" -> "Firestore Database", chọn "Create database" ở chế độ Production (chọn region asia-southeast1 hoặc gần nhất).',
  },
  {
    step: 3,
    title: 'Bật Authentication',
    desc: 'Vào "Authentication" -> "Sign-in method", bật Email/Password và Google Sign-in.',
  },
  {
    step: 4,
    title: 'Cài đặt Security Rules',
    desc: 'Vào tab "Rules" trong Firestore Database, sao chép toàn bộ nội dung Security Rules ở trên và dán vào, sau đó nhấn "Publish".',
  },
  {
    step: 5,
    title: 'Sao chép Firebase Config vào ứng dụng',
    desc: 'Vào Project Settings -> Web apps -> Copy firebaseConfig object vào file môi trường .env hoặc phần cấu hình trong app.',
  },
];
