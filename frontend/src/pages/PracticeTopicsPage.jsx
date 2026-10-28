import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Brain,
  Calculator,
  BookOpen,
  BarChart3,
  Search,
  Filter,
  Play,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { questionService } from '../services/questionService';
import { testService } from '../services/testService';
import { companyService } from '../services/companyService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

const categoryIcons = {
  'Quantitative Aptitude': Calculator,
  'Logical Reasoning': Brain,
  'Verbal Ability': BookOpen,
  'Data Interpretation': BarChart3
};

export default function PracticeTopicsPage() {
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);

  // Practice Config Modal State (Form 5)
  const [modalOpen, setModalOpen] = useState(false);
  const [drillConfig, setDrillConfig] = useState({
    category: '',
    topic: '',
    difficulty: 'medium',
    company: '',
    count: 10
  });
  const [isStarting, setIsStarting] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [catData, compData] = await Promise.all([
          questionService.getCategories(),
          companyService.getCompanies()
        ]);
        setCategories(catData || []);
        setCompanies(compData || []);

        const topicParam = searchParams.get('topic');
        const catParam = searchParams.get('category');
        if (topicParam) {
          setDrillConfig((prev) => ({
            ...prev,
            topic: topicParam,
            category: catParam || ''
          }));
          setModalOpen(true);
        }
      } catch (err) {
        console.error('Error loading practice categories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchParams]);

  const handleOpenDrillModal = (categoryName, topicName) => {
    setDrillConfig({
      category: categoryName,
      topic: topicName,
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : 'medium',
      company: '',
      count: 10
    });
    setModalOpen(true);
  };

  const handleStartDrill = async (e) => {
    e.preventDefault();
    setIsStarting(true);
    try {
      const payload = {
        category: drillConfig.category || undefined,
        topic: drillConfig.topic || undefined,
        difficulty: drillConfig.difficulty !== 'all' ? drillConfig.difficulty : undefined,
        company: drillConfig.company || undefined,
        count: Number(drillConfig.count) || 10
      };

      const session = await testService.startPractice(payload);
      addToast({
        title: 'Practice Started',
        message: `${session.title} (${session.totalQuestions} questions)`,
        type: 'success'
      });
      navigate(`/practice/session/${session.attemptId}`, { state: { session } });
    } catch (err) {
      addToast({
        title: 'Could not start practice',
        message: err.message || 'Please check your connection',
        type: 'error'
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Filter topics
  const filteredCategories = categories
    .map((cat) => {
      const matchingTopics = cat.topics.filter((topic) => {
        const matchesSearch =
          topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.subtopics.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory =
          selectedCategory === 'All' || cat.name === selectedCategory;
        return matchesSearch && matchesCategory;
      });
      return { ...cat, topics: matchingTopics };
    })
    .filter((cat) => cat.topics.length > 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            APTITUDE DRILLS
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Topic-Wise Practice
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Curated engineering placement problems with step-by-step solutions
          </p>
        </div>

        <button
          onClick={() => handleOpenDrillModal('', '')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 cursor-pointer self-start md:self-auto"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Quick 10-Q Mix Drill</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic (e.g. Time and Work, Syllogisms, Percentages)..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full md:w-auto px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & Topics Grid */}
      <div className="space-y-8">
        {filteredCategories.map((cat) => {
          const IconComponent = categoryIcons[cat.name] || Brain;
          return (
            <div key={cat._id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cat.topics.map((topic) => (
                  <div
                    key={topic._id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow hover:card-shadow-hover transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          {topic.questionCount} Questions Available
                        </span>
                        <Badge variant="teal">High Placement Weight</Badge>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                        {topic.name}
                      </h4>

                      {/* Subtopics Pills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {topic.subtopics.map((sub) => (
                          <span
                            key={sub}
                            className="px-2 py-0.5 rounded-md text-[11px] bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Difficulty: <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">{selectedDifficulty}</span>
                      </span>
                      <button
                        onClick={() => handleOpenDrillModal(cat.name, topic.name)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 text-teal-700 dark:text-teal-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>Start Practice</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No matching topics found
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or category filter.
            </p>
          </div>
        )}
      </div>

      {/* Practice Drill Configuration Modal (Form 5) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-teal-600">
                  FORM 5: PRACTICE DRILL
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Configure Practice Session
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartDrill} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={drillConfig.category || 'All Categories'}
                  readOnly
                  className="w-full px-3.5 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  value={drillConfig.topic || 'All Topics (Mixed)'}
                  readOnly
                  className="w-full px-3.5 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={drillConfig.difficulty}
                    onChange={(e) => setDrillConfig({ ...drillConfig, difficulty: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Question Count
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="50"
                    value={drillConfig.count}
                    onChange={(e) => setDrillConfig({ ...drillConfig, count: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Company (Optional)
                </label>
                <select
                  value={drillConfig.company}
                  onChange={(e) => setDrillConfig({ ...drillConfig, company: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="">All Companies / Generic</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStarting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>{isStarting ? 'Preparing drill...' : 'Start Solving'}</span>
                  <Play className="w-3.5 h-3.5 fill-white" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
