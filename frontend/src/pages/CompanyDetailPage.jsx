import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Timer,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Award
} from 'lucide-react';
import { companyService } from '../services/companyService';
import { testService } from '../services/testService';
import { useToast } from '../context/ToastContext';
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

export default function CompanyDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompany() {
      try {
        const res = await companyService.getCompanyBySlug(slug);
        setCompany(res);
      } catch (err) {
        console.error('Failed to load company detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompany();
  }, [slug]);

  const handleStartCompanyPractice = async () => {
    try {
      const session = await testService.startPractice({
        company: company.name,
        count: 10
      });
      addToast({
        title: `${company.name} Practice Drill Started`,
        message: '10 questions aligned with verified hiring pattern',
        type: 'success'
      });
      navigate(`/practice/session/${session.attemptId}`, { state: { session } });
    } catch (err) {
      addToast({
        title: 'Could not initialize session',
        message: err.message,
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-16 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
          Company Not Found
        </h3>
        <button
          onClick={() => navigate('/companies')}
          className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/companies')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Company Directory</span>
        </button>
      </div>

      {/* Hero Banner Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-black text-2xl flex items-center justify-center border border-teal-100 dark:border-teal-900 shadow-xs shrink-0">
              {company.name.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="teal">{company.badge || 'Campus Recruiter'}</Badge>
                <span className="text-xs text-slate-400 font-mono">
                  {company.questionCount} Verified Questions
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {company.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {company.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartCompanyPractice}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start 10-Q Practice Drill</span>
            </button>
            <button
              onClick={() => navigate(`/tests?company=${encodeURIComponent(company.name)}&type=company_mock`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Timer className="w-4 h-4" />
              <span>Take Full Mock Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pattern & Eligibility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Pattern */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <Timer className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hiring Test Pattern & Sections
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-4">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {formatHiringPattern(company.hiringPattern)}
            </p>
          </div>
          {company.rounds && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Selection Rounds
              </span>
              {company.rounds.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 text-xs border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {r.name}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {r.duration} • {r.questions} questions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eligibility & Key Topics */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Eligibility & Academic Criteria
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 mb-6">
              <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                {company.eligibilityNotes || 'Standard university placement requirements apply.'}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Frequently Tested Aptitude Topics
              </span>
              <div className="flex flex-wrap gap-2">
                {(company.keyTopics || ['Time and Work', 'Syllogisms', 'Percentages']).map((topic) => (
                  <button
                    key={topic}
                    onClick={() => navigate(`/practice?topic=${encodeURIComponent(topic)}`)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700/60 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200/50 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {topic} →
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Source: College Training & Placement Cell records & campus recruitment guidelines.
          </div>
        </div>
      </div>
    </div>
  );
}
