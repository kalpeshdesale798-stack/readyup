import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Brain, Building2, Timer, HelpCircle, Users, Loader2, BookOpen } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function SearchModal({ isOpen, onClose }) {
  const { role } = useAuth();
  const isCoordinator = role === 'coordinator';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    topics: [],
    companies: [],
    mockTests: [],
    questions: [],
    users: [],
    coordinatorPages: [],
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ topics: [], companies: [], mockTests: [], questions: [], users: [] });
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.request(`/search?q=${encodeURIComponent(query.trim())}`, { method: 'GET' });
        if (res?.data) {
          setResults({
            topics: res.data.topics || [],
            companies: res.data.companies || [],
            mockTests: isCoordinator ? [] : (res.data.mockTests || []),
            questions: res.data.questions || [],
            users: res.data.users || [],
            coordinatorPages: res.data.coordinatorPages || [],
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isCoordinator]);

  if (!isOpen) return null;

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  const hasResults =
    results.topics.length > 0 ||
    results.companies.length > 0 ||
    (!isCoordinator && results.mockTests.length > 0) ||
    results.questions.length > 0 ||
    results.users.length > 0 ||
    (results.coordinatorPages && results.coordinatorPages.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          {loading ? (
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-slate-400" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, companies, tests, questions..."
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {/* Topics */}
          {results.topics.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Aptitude Topics
              </p>
              <div className="space-y-1">
                {results.topics.map((top, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(top.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Brain className="w-4 h-4 text-teal-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                        {top.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCoordinator ? 'View Questions →' : 'Practice →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Companies */}
          {results.companies.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Hiring Companies
              </p>
              <div className="space-y-1">
                {results.companies.map((comp) => (
                  <button
                    key={comp._id}
                    onClick={() => handleSelect(comp.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                          {comp.name}
                        </span>
                        {comp.tagline && (
                          <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                            • {comp.tagline}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCoordinator ? 'Manage Questions →' : 'View Pattern →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mock Tests - Strictly student-facing */}
          {!isCoordinator && results.mockTests.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mock Tests
              </p>
              <div className="space-y-1">
                {results.mockTests.map((test) => (
                  <button
                    key={test._id}
                    onClick={() => handleSelect(test.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Timer className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                        {test.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{test.durationMinutes} mins</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coordinator Tools & Resources */}
          {isCoordinator && results.coordinatorPages && results.coordinatorPages.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Coordinator Tools &amp; Actions
              </p>
              <div className="space-y-1">
                {results.coordinatorPages.map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(page.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-teal-600" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700">
                          {page.title}
                        </span>
                        {page.description && (
                          <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                            • {page.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open Tool →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          {results.questions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Questions
              </p>
              <div className="space-y-1">
                {results.questions.map((q) => (
                  <button
                    key={q._id}
                    onClick={() => handleSelect(q.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-teal-600 mr-2">{q.questionId}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {q.questionText}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 capitalize ml-2">{q.difficulty}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users (Admin Only) */}
          {results.users.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                User Accounts
              </p>
              <div className="space-y-1">
                {results.users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleSelect(u.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left hover:bg-teal-50 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-sky-600" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {u.name}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({u.email} • <span className="capitalize">{u.role}</span>)
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Manage →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim().length >= 2 && !loading && !hasResults && (
            <div className="py-8 text-center text-xs text-slate-400">
              {isCoordinator
                ? `No matching coordinator resources found for "${query}"`
                : `No matching records found for "${query}"`}
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type at least 2 characters to search across topics, tests, companies, and questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
