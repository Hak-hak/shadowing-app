import React, { useState } from 'react';
import { Database, ShieldCheck, FileCode, Check, Copy, ExternalLink, HelpCircle, Server, Terminal, X } from 'lucide-react';
import { FIREBASE_SECURITY_RULES, FIRESTORE_DATABASE_SCHEMA, FIREBASE_SETUP_GUIDE } from '../services/firebaseConfig';

interface FirebaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'schema' | 'guide' | 'deploy'>('guide');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIREBASE_SECURITY_RULES);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="firebase-guide-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-6 h-6 text-amber-100" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Hướng Dẫn Firebase & Triển Khai Backend</h3>
              <p className="text-xs text-amber-100">Firestore Database, Security Rules & Phân Quyền Giáo Viên / Học Sinh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 text-xs md:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Các bước cài đặt
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 text-xs md:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Security Rules
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 text-xs md:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'schema'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Firestore Schema
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-4 py-2 text-xs md:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'deploy'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Hướng dẫn Deploy
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-700">
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-900 mb-4">
                <h4 className="font-bold flex items-center gap-2 mb-1">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Nguyên lý hoạt động Một Người Tạo - Nhiều Người Học
                </h4>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Giáo viên tạo bài tập và hệ thống sinh một <strong>Mã chia sẻ (Share Code)</strong> (ví dụ: <code className="bg-indigo-200 px-1 py-0.5 rounded font-mono">EN-8A3F2</code>). Học sinh chỉ cần nhập mã hoặc mở liên kết là có thể nghe, đọc, lướt từ và luyện Shadowing mà không cần tài khoản phức tạp.
                </p>
              </div>

              <div className="space-y-3">
                {FIREBASE_SETUP_GUIDE.map((step) => (
                  <div key={step.step} className="flex gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      {step.step}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">{step.title}</h5>
                      <p className="text-xs text-slate-600 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Firebase Security Rules (firestore.rules) phân quyền Teacher & Student:
                </span>
                <button
                  onClick={handleCopyRules}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép Rules'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
                {FIREBASE_SECURITY_RULES}
              </pre>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Cấu trúc Database được thiết kế chuẩn NoSQL Firestore Document-Oriented:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100">
                  <div className="text-amber-400 font-bold mb-2">// 1. Collection: /lessons/{'{lessonId}'}</div>
                  <pre className="text-emerald-300 whitespace-pre-wrap">
                    {JSON.stringify(FIRESTORE_DATABASE_SCHEMA.collections.lessons, null, 2)}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-slate-100">
                  <div className="text-amber-400 font-bold mb-2">// 2. Collection: /users/{'{userId}'}/progress/{'{lessonId}'}</div>
                  <pre className="text-blue-300 whitespace-pre-wrap">
                    {JSON.stringify(FIRESTORE_DATABASE_SCHEMA.collections.userProgress, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h5 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  Triển khai bằng Firebase CLI
                </h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
                  <li>Cài đặt Firebase CLI: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">npm install -g firebase-tools</code></li>
                  <li>Đăng nhập: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">firebase login</code></li>
                  <li>Khởi tạo: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">firebase init firestore hosting</code></li>
                  <li>Build sản phẩm: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">npm run build</code></li>
                  <li>Deploy toàn bộ lên Cloud: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">firebase deploy</code></li>
                </ol>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h5 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Cấu hình AI API (Gemini API)
                </h5>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  API Key được lưu bảo mật ở server-side trong <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">.env</code> hoặc Google Cloud Run Secrets:
                </p>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs">
                  GEMINI_API_KEY="AIzaSy..."
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
