import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  ChevronRight,
  BookOpen,
  Timer,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { companyService } from '../services/companyService';
import Badge from '../components/common/Badge';

function formatHiringPattern(hp) {
  if (!hp) return 'Online Assessment: 60 mins • Quantitative, Logical & Verbal Aptitude';
  if (typeof hp === 'string') return hp;
  const dur = hp.testDuration || 60;
  const total = hp.totalQuestions || 30;
  const sections = Array.isArray(hp.sections) && hp.sections.length > 0
    ? hp.sections.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean).join(', ')
    : 'Quantitative, Logical & Verbal';
  return `${dur} mins • ${total} Questions (${sections})`;
}

export default function CompanyDirectoryPage() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await companyService.getCompanies();
        setCompanies(res || []);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase();
    const patternStr = typeof c.hiringPattern === 'string' ? c.hiringPattern : '';
    return (
      c.name?.toLowerCase().includes(q) ||
      c.tagline?.toLowerCase().includes(q) ||
      patternStr.toLowerCase().includes(q) ||
      c.keyTopics?.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            CAMPUS RECRUITMENT PATTERNS
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Company-Wise Preparation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verified hiring test formats, syllabus breakdown, and company-specific mock drills
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or exam..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white card-shadow"
          />
        </div>
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((comp) => (
          <div
            key={comp._id}
            onClick={() => navigate(`/companies/${comp.slug}`)}
            className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow hover:card-shadow-hover transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-extrabold text-base flex items-center justify-center border border-teal-100 dark:border-teal-900/60 shadow-xs">
                    {comp.name.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                      {comp.name}
                    </h3>
                    <span className="text-xs text-slate-400 line-clamp-1">
                      {comp.tagline || 'Placement Drive'}
                    </span>
                  </div>
                </div>
                <Badge variant="teal">{comp.badge || 'Verified'}</Badge>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                {comp.description}
              </p>

              {/* Hiring Pattern Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Exam Pattern
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                  {formatHiringPattern(comp.hiringPattern)}
                </p>
              </div>

              {/* Topics tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(comp.keyTopics || ['Quant', 'Logical', 'Verbal']).slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {comp.questionCount} Questions
              </span>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
