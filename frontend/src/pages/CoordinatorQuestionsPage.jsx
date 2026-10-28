import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  X
} from 'lucide-react';
import { questionService } from '../services/questionService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function CoordinatorQuestionsPage() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';

  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(urlSearch);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Form 8 Modal: Single Question Creation
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    questionId: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
    category: 'Quantitative Aptitude',
    topic: 'Time and Work',
    subtopic: 'General',
    difficulty: 'medium',
    companies: 'TCS, Infosys',
    source: 'Campus Drive 2026',
    year: 2026
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { addToast } = useToast();

  const loadData = async (overrideSearch) => {
    try {
      const activeSearch = overrideSearch !== undefined ? overrideSearch : search;
      const [qRes, catRes] = await Promise.all([
        questionService.getQuestions({
          search: activeSearch || undefined,
          category: categoryFilter || undefined,
          difficulty: difficultyFilter || undefined
        }),
        questionService.getCategories()
      ]);
      setQuestions(qRes.data || []);
      setCategories(catRes || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(urlSearch);
  }, [categoryFilter, difficultyFilter, urlSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleToggleStatus = async (qId, currentStatus) => {
    try {
      await questionService.toggleStatus(qId, !currentStatus);
      setQuestions((prev) =>
        prev.map((q) => (q.questionId === qId || q._id === qId ? { ...q, isActive: !currentStatus } : q))
      );
      addToast({
        title: 'Status Updated',
        message: `Question ${qId} marked ${!currentStatus ? 'Active' : 'Deactivated'}`,
        type: 'info'
      });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.questionId.trim()) {
      setFormError('Question ID is required (e.g. QA-TW-105)');
      return;
    }
    if (formData.questionText.trim().length < 5) {
      setFormError('Question text must be at least 5 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        questionId: formData.questionId.trim().toUpperCase(),
        questionText: formData.questionText,
        options: [
          { optionId: 'A', text: formData.optionA },
          { optionId: 'B', text: formData.optionB },
          { optionId: 'C', text: formData.optionC },
          { optionId: 'D', text: formData.optionD }
        ],
        correctOption: formData.correctOption,
        explanation: formData.explanation,
        category: formData.category,
        topic: formData.topic,
        subtopic: formData.subtopic,
        difficulty: formData.difficulty,
        companies: formData.companies.split(',').map((c) => c.trim()),
        source: formData.source,
        year: Number(formData.year) || 2026,
        isActive: true
      };

      await questionService.createQuestion(payload);
      addToast({
        title: 'Question Created',
        message: `Question ${payload.questionId} saved to repository`,
        type: 'success'
      });
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            QUESTION REPOSITORY
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Question Bank Manager
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review active items, toggle visibility, and author custom placement questions
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Single Question</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or question text..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-teal-500 text-slate-900 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Question ID</th>
                <th className="py-3.5 px-4">Topic / Domain</th>
                <th className="py-3.5 px-4">Difficulty</th>
                <th className="py-3.5 px-4">Question Statement</th>
                <th className="py-3.5 px-4">Correct</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {questions.map((q) => (
                <tr key={q.questionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-teal-600">
                    {q.questionId}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {q.topic}
                    </span>
                    <span className="text-[10px] text-slate-400">{q.category}</span>
                  </td>
                  <td className="py-3 px-4 capitalize">
                    <Badge variant={q.difficulty}>{q.difficulty}</Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm truncate font-normal">
                    {q.questionText}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                    {q.correctOption}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={q.isActive ? 'Passed' : 'neutral'}>
                      {q.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(q.questionId, q.isActive)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {q.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form 8: Question Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                  FORM 8: QUESTION AUTHORING
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Create Placement Question
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="my-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Question ID *
                  </label>
                  <input
                    type="text"
                    value={formData.questionId}
                    onChange={(e) => setFormData({ ...formData, questionId: e.target.value })}
                    placeholder="e.g. QA-TW-105"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Correct Option *
                  </label>
                  <select
                    value={formData.correctOption}
                    onChange={(e) => setFormData({ ...formData, correctOption: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Question Statement *
                </label>
                <textarea
                  rows="3"
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  placeholder="Enter full problem statement..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              {/* 4 Options */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Option A *</label>
                  <input
                    type="text"
                    value={formData.optionA}
                    onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Option B *</label>
                  <input
                    type="text"
                    value={formData.optionB}
                    onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Option C *</label>
                  <input
                    type="text"
                    value={formData.optionC}
                    onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Option D *</label>
                  <input
                    type="text"
                    value={formData.optionD}
                    onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Step-by-Step Solution / Explanation *
                </label>
                <textarea
                  rows="2"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Provide detailed breakdown and formulas..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Data Interpretation">Data Interpretation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
