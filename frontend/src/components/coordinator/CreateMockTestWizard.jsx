import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  BookOpen,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Layers,
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  Check,
  FileText,
  Sparkles,
  Download,
  AlertTriangle,
  HelpCircle,
  ListPlus,
  GraduationCap
} from 'lucide-react';
import { coordinatorService } from '../../services/coordinatorService';
import { questionService } from '../../services/questionService';
import { companyService } from '../../services/companyService';
import { useToast } from '../../context/ToastContext';
import Badge from '../common/Badge';

export default function CreateMockTestWizard({ isOpen, onClose, onTestCreated, editTest = null }) {
  const { addToast } = useToast();

  // Wizard Steps: 1: Details, 2: Questions, 3: Review
  const [currentStep, setCurrentStep] = useState(1);

  // Available Data
  const [departmentsList, setDepartmentsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Test Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mixed Aptitude');
  const [company, setCompany] = useState('General');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [status, setStatus] = useState('published');
  const [isScheduled, setIsScheduled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Department targeting
  const [selectedDepartments, setSelectedDepartments] = useState(['ALL']);
  const [deptSearch, setDeptSearch] = useState('');

  // Step 2: Consolidated Questions State
  // Each question: { id, questionId, questionText, options, correctOption, explanation, category, topic, subtopic, difficulty, marks, source }
  const [testQuestions, setTestQuestions] = useState([]);

  // Question Adding Sub-tabs: 'bank' | 'csv' | 'manual'
  const [activeQuestionTab, setActiveQuestionTab] = useState('bank');

  // Method A: CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState(null);
  const [saveCsvQuestionsToBank, setSaveCsvQuestionsToBank] = useState(true);

  // Method B: Question Bank Browser State
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankCategory, setBankCategory] = useState('all');
  const [bankTopic, setBankTopic] = useState('all');
  const [bankDifficulty, setBankDifficulty] = useState('all');
  const [bankCompany, setBankCompany] = useState('all');
  const [bankSearch, setBankSearch] = useState('');
  const [bankPage, setBankPage] = useState(1);
  const [bankPagination, setBankPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedBankQuestionMap, setSelectedBankQuestionMap] = useState(new Map());

  // Method C: Manual Question Entry State
  const [manualForm, setManualForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    category: 'Quantitative Aptitude',
    topic: 'Time and Work',
    subtopic: '',
    difficulty: 'medium',
    marks: 1,
    explanation: '',
    saveToBank: true,
  });

  // Load initial dropdowns
  useEffect(() => {
    if (!isOpen) return;

    async function loadInitialData() {
      try {
        const [depts, cats, comps] = await Promise.all([
          coordinatorService.getDepartments().catch(() => []),
          questionService.getCategories().catch(() => []),
          companyService.getCompanies().catch(() => []),
        ]);
        setDepartmentsList(depts || []);
        setCategoriesList(cats || []);
        setCompaniesList(comps || []);
      } catch (err) {
        console.error('Failed to load initial wizard data:', err);
      }
    }
    loadInitialData();
  }, [isOpen]);

  // Populate edit data if provided
  useEffect(() => {
    if (editTest && isOpen) {
      setTitle(editTest.title || '');
      setDescription(editTest.description || '');
      setCategory(editTest.category || 'Mixed Aptitude');
      setCompany(editTest.company || 'General');
      setDurationMinutes(editTest.durationMinutes || 60);
      setPassingScore(editTest.passingScore || 60);
      setStatus(editTest.status || 'published');
      const effectiveStart = editTest.startDate || editTest.startTime;
      const effectiveEnd = editTest.endDate || editTest.deadline;
      setIsScheduled(Boolean(editTest.isScheduled || effectiveStart || effectiveEnd));
      setStartDate(effectiveStart ? new Date(effectiveStart).toISOString().slice(0, 16) : '');
      setEndDate(effectiveEnd ? new Date(effectiveEnd).toISOString().slice(0, 16) : '');

      const depts = editTest.assignedDepartments?.length
        ? editTest.assignedDepartments
        : editTest.assignedBatches?.length
          ? editTest.assignedBatches
          : ['ALL'];
      setSelectedDepartments(depts);

      // Load existing questions
      if (Array.isArray(editTest.questions)) {
        const mapped = editTest.questions.map((q, idx) => ({
          _id: q._id || `q_${idx}`,
          questionId: q.questionId || `Q-${idx + 1}`,
          questionText: q.questionText || '',
          options: q.options || [],
          correctOption: q.correctOption || 'A',
          explanation: q.explanation || '',
          category: q.category || editTest.category || 'General',
          topic: q.topic || 'General',
          subtopic: q.subtopic || '',
          difficulty: q.difficulty || 'medium',
          marks: q.marks || 1,
          source: q.source || (q.questionSource === 'csv' ? 'CSV Upload' : 'Existing Question'),
        }));
        setTestQuestions(mapped);
      }
    } else if (!editTest && isOpen) {
      // Reset form on open
      setCurrentStep(1);
      setTitle('');
      setDescription('');
      setCategory('Mixed Aptitude');
      setCompany('General');
      setDurationMinutes(60);
      setPassingScore(60);
      setStatus('published');
      setIsScheduled(false);
      setStartDate('');
      setEndDate('');
      setSelectedDepartments(['ALL']);
      setTestQuestions([]);
      setSelectedBankQuestionMap(new Map());
      setCsvFile(null);
      setCsvPreviewData(null);
    }
  }, [editTest, isOpen]);

  // Bank Questions Loader
  const loadBankQuestions = async () => {
    setBankLoading(true);
    try {
      const params = {
        page: bankPage,
        limit: 8,
      };
      if (bankCategory !== 'all') params.category = bankCategory;
      if (bankTopic !== 'all') params.topic = bankTopic;
      if (bankDifficulty !== 'all') params.difficulty = bankDifficulty;
      if (bankCompany !== 'all') params.company = bankCompany;
      if (bankSearch.trim()) params.search = bankSearch.trim();

      const res = await questionService.getQuestions(params);
      setBankQuestions(res.data || []);
      setBankPagination(res.pagination || { total: res.data?.length || 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load question bank questions:', err);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentStep === 2 && activeQuestionTab === 'bank') {
      loadBankQuestions();
    }
  }, [isOpen, currentStep, activeQuestionTab, bankPage, bankCategory, bankTopic, bankDifficulty, bankCompany]);

  // Handle department toggles
  const handleToggleDepartment = (dept) => {
    if (dept === 'ALL') {
      setSelectedDepartments(['ALL']);
      return;
    }

    let updated = selectedDepartments.filter((d) => d !== 'ALL');
    if (updated.includes(dept)) {
      updated = updated.filter((d) => d !== dept);
    } else {
      updated.push(dept);
    }

    if (updated.length === 0) {
      // Empty selection: keep as empty so coordinator explicitly sees 0 selected departments
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(updated);
    }
  };

  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return departmentsList;
    return departmentsList.filter((d) =>
      d.toLowerCase().includes(deptSearch.toLowerCase().trim())
    );
  }, [departmentsList, deptSearch]);

  // Method A: Handle CSV File Preview
  const handleCsvFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvParsing(true);
    try {
      const res = await coordinatorService.previewImport(file);
      setCsvPreviewData(res);
      addToast({
        title: 'CSV File Parsed',
        message: `${res.validRowsCount} valid questions parsed. ${res.invalidRowsCount} errors.`,
        type: res.invalidRowsCount > 0 ? 'warning' : 'success',
      });
    } catch (err) {
      addToast({
        title: 'CSV Parsing Error',
        message: err.message || 'Failed to read spreadsheet file',
        type: 'error',
      });
      setCsvPreviewData(null);
    } finally {
      setCsvParsing(false);
    }
  };

  const handleAddCsvQuestionsToTest = () => {
    if (!csvPreviewData || !csvPreviewData.validRows || csvPreviewData.validRows.length === 0) {
      addToast({ title: 'No Valid Questions', message: 'No valid rows to add.', type: 'warning' });
      return;
    }

    const existingIds = new Set(testQuestions.map((q) => q.questionId || q._id));
    const newItems = [];
    let duplicatesSkipped = 0;

    for (const row of csvPreviewData.validRows) {
      if (existingIds.has(row.questionId)) {
        duplicatesSkipped++;
        continue;
      }
      existingIds.add(row.questionId);
      newItems.push({
        _id: `csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        questionId: row.questionId,
        questionText: row.questionText,
        options: row.options,
        correctOption: row.correctOption,
        explanation: row.explanation || '',
        category: row.category || category,
        topic: row.topic || 'General',
        subtopic: row.subtopic || '',
        difficulty: row.difficulty || 'medium',
        companies: row.companies || [],
        marks: 1,
        source: 'CSV Upload',
        saveToBank: saveCsvQuestionsToBank,
      });
    }

    setTestQuestions((prev) => [...prev, ...newItems]);
    addToast({
      title: 'Questions Added',
      message: `Added ${newItems.length} questions from CSV to test blueprint.${duplicatesSkipped > 0 ? ` (${duplicatesSkipped} duplicates skipped)` : ''}`,
      type: 'success',
    });
    setCsvFile(null);
    setCsvPreviewData(null);
  };

  // Method B: Handle Question Bank Selection
  const handleToggleBankQuestion = (q) => {
    setSelectedBankQuestionMap((prev) => {
      const next = new Map(prev);
      if (next.has(q._id)) {
        next.delete(q._id);
      } else {
        next.set(q._id, q);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const allSelected = bankQuestions.every((q) => selectedBankQuestionMap.has(q._id));
    setSelectedBankQuestionMap((prev) => {
      const next = new Map(prev);
      if (allSelected) {
        bankQuestions.forEach((q) => next.delete(q._id));
      } else {
        bankQuestions.forEach((q) => next.set(q._id, q));
      }
      return next;
    });
  };

  const handleAddSelectedBankQuestions = () => {
    if (selectedBankQuestionMap.size === 0) {
      addToast({ title: 'No Questions Selected', message: 'Please select questions first.', type: 'warning' });
      return;
    }

    const existingIds = new Set(testQuestions.map((q) => q._id || q.questionId));
    const newItems = [];
    let duplicatesSkipped = 0;

    selectedBankQuestionMap.forEach((q) => {
      if (existingIds.has(q._id)) {
        duplicatesSkipped++;
        return;
      }
      existingIds.add(q._id);
      newItems.push({
        _id: q._id,
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation || '',
        category: q.category || 'General',
        topic: q.topic || 'General',
        subtopic: q.subtopic || '',
        difficulty: q.difficulty || 'medium',
        marks: 1,
        source: 'Question Bank',
      });
    });

    setTestQuestions((prev) => [...prev, ...newItems]);
    setSelectedBankQuestionMap(new Map());
    addToast({
      title: 'Questions Added',
      message: `Added ${newItems.length} questions from repository.${duplicatesSkipped > 0 ? ` (${duplicatesSkipped} already in test)` : ''}`,
      type: 'success',
    });
  };

  // Method C: Handle Manual Question Entry
  const handleAddManualQuestion = (e) => {
    e.preventDefault();
    if (!manualForm.questionText.trim()) {
      addToast({ title: 'Validation Error', message: 'Question text is required.', type: 'error' });
      return;
    }
    if (!manualForm.optionA.trim() || !manualForm.optionB.trim()) {
      addToast({ title: 'Validation Error', message: 'At least Option A and Option B are required.', type: 'error' });
      return;
    }

    const options = [
      { optionId: 'A', text: manualForm.optionA.trim() },
      { optionId: 'B', text: manualForm.optionB.trim() },
    ];
    if (manualForm.optionC.trim()) options.push({ optionId: 'C', text: manualForm.optionC.trim() });
    if (manualForm.optionD.trim()) options.push({ optionId: 'D', text: manualForm.optionD.trim() });

    const newQuestion = {
      _id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      questionId: `MAN-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      questionText: manualForm.questionText.trim(),
      options,
      correctOption: manualForm.correctOption,
      explanation: manualForm.explanation.trim(),
      category: manualForm.category,
      topic: manualForm.topic || 'General',
      subtopic: manualForm.subtopic || '',
      difficulty: manualForm.difficulty,
      marks: Number(manualForm.marks) || 1,
      source: 'Manual Entry',
      saveToBank: manualForm.saveToBank,
    };

    setTestQuestions((prev) => [...prev, newQuestion]);
    addToast({
      title: 'Question Added',
      message: `Manual question added to test blueprint. Total: ${testQuestions.length + 1}`,
      type: 'success',
    });

    // Reset fields for convenient next question entry
    setManualForm((prev) => ({
      ...prev,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      explanation: '',
    }));
  };

  // Remove question from test blueprint
  const handleRemoveQuestion = (idxToRemove) => {
    setTestQuestions((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Move question order
  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= testQuestions.length) return;
    setTestQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Calculations for Step 3
  const totalCalculatedMarks = useMemo(() => {
    return testQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  }, [testQuestions]);

  const topicDistribution = useMemo(() => {
    const dist = {};
    testQuestions.forEach((q) => {
      const t = q.topic || 'General';
      dist[t] = (dist[t] || 0) + 1;
    });
    return dist;
  }, [testQuestions]);

  const difficultyDistribution = useMemo(() => {
    const dist = { easy: 0, medium: 0, hard: 0 };
    testQuestions.forEach((q) => {
      const d = (q.difficulty || 'medium').toLowerCase();
      if (dist[d] !== undefined) dist[d]++;
      else dist.medium++;
    });
    return dist;
  }, [testQuestions]);

  const sourceDistribution = useMemo(() => {
    const dist = {};
    testQuestions.forEach((q) => {
      const s = q.source || 'Other';
      dist[s] = (dist[s] || 0) + 1;
    });
    return dist;
  }, [testQuestions]);

  // Validation Before Publish
  const validateTest = (isDraft = false) => {
    if (!title.trim()) {
      addToast({ title: 'Validation Error', message: 'Test title is required.', type: 'error' });
      setCurrentStep(1);
      return false;
    }
    if (durationMinutes <= 0) {
      addToast({ title: 'Validation Error', message: 'Duration must be greater than 0 minutes.', type: 'error' });
      setCurrentStep(1);
      return false;
    }
    if (passingScore <= 0 || passingScore > 100) {
      addToast({ title: 'Validation Error', message: 'Passing percentage must be between 1% and 100%.', type: 'error' });
      setCurrentStep(1);
      return false;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      addToast({ title: 'Validation Error', message: 'Start date cannot be after deadline.', type: 'error' });
      setCurrentStep(1);
      return false;
    }
    if (!isDraft && testQuestions.length === 0) {
      addToast({ title: 'Validation Error', message: 'Please add at least 1 question before publishing.', type: 'error' });
      setCurrentStep(2);
      return false;
    }
    return true;
  };

  // Final Submit Handler
  const handleSaveTest = async (overrideStatus = null) => {
    const finalStatus = overrideStatus || status;
    const isDraft = finalStatus === 'draft';
    if (!validateTest(isDraft)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        company,
        durationMinutes: Number(durationMinutes),
        passingScore: Number(passingScore),
        assignedDepartments: selectedDepartments,
        assignedBatches: selectedDepartments,
        isScheduled: Boolean(isScheduled),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        startTime: startDate ? new Date(startDate).toISOString() : null,
        deadline: endDate ? new Date(endDate).toISOString() : null,
        status: finalStatus,
        totalMarks: totalCalculatedMarks || testQuestions.length,
        questions: testQuestions, // Coordinator backend handles ObjectIds & creates manual/CSV question records
      };

      if (editTest && editTest._id) {
        await coordinatorService.updateMockTest(editTest._id, payload);
        addToast({
          title: finalStatus === 'published' ? 'Mock Test Published' : 'Draft Updated',
          message: `'${payload.title}' was successfully ${finalStatus === 'published' ? 'published and made available to students' : 'updated as draft'}.`,
          type: 'success',
        });
      } else {
        await coordinatorService.createMockTest(payload);
        addToast({
          title: finalStatus === 'published' ? 'Mock Test Created' : 'Draft Saved',
          message: `'${payload.title}' is now ${finalStatus === 'published' ? 'published and accessible' : 'saved as draft'}.`,
          type: 'success',
        });
      }

      if (onTestCreated) onTestCreated();
      onClose();
    } catch (err) {
      addToast({
        title: 'Failed to Save Test',
        message: err.message || 'An error occurred while saving the mock test.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                {editTest ? 'EDIT MOCK TEST' : 'CREATE MOCK TEST WIZARD'}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-semibold text-slate-500">Step {currentStep} of 3</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {currentStep === 1 && 'Test Details & Department Targeting'}
              {currentStep === 2 && 'Add Questions (Bank, CSV, or Manual)'}
              {currentStep === 3 && 'Consolidated Review & Final Publication'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-2">
              {[
                { num: 1, label: 'Details' },
                { num: 2, label: 'Questions' },
                { num: 3, label: 'Review' },
              ].map((s) => (
                <div
                  key={s.num}
                  onClick={() => (s.num < currentStep || validateTest()) && setCurrentStep(s.num)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    currentStep === s.num
                      ? 'bg-teal-600 text-white shadow-xs'
                      : currentStep > s.num
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {currentStep > s.num ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span>{s.num}.</span>
                  )}
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ================= STEP 1: TEST DETAILS & DEPARTMENTS ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Basic Details */}
              <div className="bg-slate-50/50 dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Basic Assessment Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Test Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TCS NQT 2026 National Qualifier Grand Simulation"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Description & Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Provide candidates with guidelines, exam pattern details, or campus placement instructions..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Domain Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="Mixed Aptitude">Mixed Aptitude</option>
                        <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                        <option value="Logical Reasoning">Logical Reasoning</option>
                        <option value="Verbal Ability">Verbal Ability</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Target Company
                      </label>
                      <select
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="General">General / All Companies</option>
                        {companiesList.map((c) => (
                          <option key={c._id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="240"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Passing Cutoff (%)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Targeting */}
              <div className="bg-slate-50/50 dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-teal-600" />
                      Department Targeting & Access Control
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Target this mock test to specific academic departments or make it open campus-wide.
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter departments..."
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {/* Explicit All Departments Option */}
                  <div
                    onClick={() => handleToggleDepartment('ALL')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDepartments.includes('ALL')
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">All Departments</div>
                      <div className="text-[10px] text-slate-400">Campus-wide placement simulation</div>
                    </div>
                    {selectedDepartments.includes('ALL') && (
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    )}
                  </div>

                  {filteredDepartments.map((dept) => {
                    const isSelected = selectedDepartments.includes(dept);
                    return (
                      <div
                        key={dept}
                        onClick={() => handleToggleDepartment(dept)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold truncate pr-2">{dept}</div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  Selected:{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedDepartments.includes('ALL')
                      ? 'All Departments (Open to every student)'
                      : selectedDepartments.length > 0
                        ? selectedDepartments.join(', ')
                        : 'None (Restricted draft mode)'}
                  </span>
                </div>
              </div>

              {/* Scheduling & Publication Status */}
              <div className="bg-slate-50/50 dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Scheduling & Test Availability Windows
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Publication Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="published">Published (Visible to eligible students)</option>
                      <option value="draft">Draft (Hidden from students)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Start Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value) setIsScheduled(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Deadline / End Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (e.target.value) setIsScheduled(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="scheduleToggle"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="scheduleToggle" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    Enforce strict availability schedule (Students cannot launch before start date or after deadline)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: ADD QUESTIONS VIA 3 METHODS ================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Question Pool Counter Banner */}
              <div className="bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl p-4 border border-teal-200 dark:border-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold font-mono">
                    {testQuestions.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Current Test Blueprint: {testQuestions.length} Questions ({totalCalculatedMarks} Total Marks)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      You can combine questions from Question Bank, CSV spreadsheets, and Manual entry.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={testQuestions.length === 0}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Review Test ({testQuestions.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-tabs for the 3 Methods */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveQuestionTab('bank')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeQuestionTab === 'bank'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Select From Question Bank</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveQuestionTab('csv')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeQuestionTab === 'csv'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Spreadsheet / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveQuestionTab('manual')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    activeQuestionTab === 'manual'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Manual Question Entry</span>
                </button>
              </div>

              {/* ---------- METHOD B: QUESTION BANK BROWSER ---------- */}
              {activeQuestionTab === 'bank' && (
                <div className="space-y-4">
                  {/* Multi-Filters Bar */}
                  <div className="bg-slate-50/50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search question text or ID..."
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <select
                        value={bankCategory}
                        onChange={(e) => {
                          setBankCategory(e.target.value);
                          setBankTopic('all');
                          setBankPage(1);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {categoriesList.map((c) => (
                          <option key={c._id || c.name} value={c.name}>
                            {c.name} ({c.questionCount || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={bankDifficulty}
                        onChange={(e) => {
                          setBankDifficulty(e.target.value);
                          setBankPage(1);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={bankCompany}
                        onChange={(e) => {
                          setBankCompany(e.target.value);
                          setBankPage(1);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="all">All Companies</option>
                        {companiesList.map((c) => (
                          <option key={c._id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSelectedBankQuestions}
                        disabled={selectedBankQuestionMap.size === 0}
                        className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add ({selectedBankQuestionMap.size})</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Bank Results */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            bankQuestions.length > 0 &&
                            bankQuestions.every((q) => selectedBankQuestionMap.has(q._id))
                          }
                          onChange={handleSelectAllOnPage}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          Select All on Current Page ({bankQuestions.length})
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        Total matching: {bankPagination.total} questions
                      </span>
                    </div>

                    {bankLoading ? (
                      <div className="py-12 text-center">
                        <div className="w-7 h-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-xs text-slate-400">Loading Question Bank...</span>
                      </div>
                    ) : bankQuestions.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No questions match the applied filters.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bankQuestions.map((q) => {
                          const isChecked = selectedBankQuestionMap.has(q._id);
                          const alreadyInTest = testQuestions.some((tq) => tq._id === q._id);

                          return (
                            <div
                              key={q._id}
                              onClick={() => !alreadyInTest && handleToggleBankQuestion(q)}
                              className={`p-4 transition-colors flex items-start gap-3 cursor-pointer ${
                                alreadyInTest
                                  ? 'bg-slate-50/80 dark:bg-slate-850/60 opacity-60'
                                  : isChecked
                                    ? 'bg-teal-50/50 dark:bg-teal-950/20'
                                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={alreadyInTest}
                                checked={isChecked || alreadyInTest}
                                onChange={() => {}}
                                className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />

                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {q.questionId}
                                  </span>
                                  <Badge variant="neutral">{q.category}</Badge>
                                  <span className="text-[11px] text-slate-400 font-medium">{q.topic}</span>
                                  <Badge
                                    variant={
                                      q.difficulty === 'easy'
                                        ? 'emerald'
                                        : q.difficulty === 'hard'
                                          ? 'rose'
                                          : 'amber'
                                    }
                                  >
                                    {q.difficulty}
                                  </Badge>

                                  {alreadyInTest && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                                      Already In Blueprint
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                                  {q.questionText}
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500">
                                  {q.options?.map((opt) => (
                                    <div
                                      key={opt.optionId}
                                      className={`px-2 py-1 rounded-lg border text-left truncate ${
                                        opt.optionId === q.correctOption
                                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                                      }`}
                                    >
                                      <span className="font-bold mr-1">{opt.optionId}:</span>
                                      {opt.text}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pagination */}
                    {bankPagination.totalPages > 1 && (
                      <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <button
                          disabled={bankPage <= 1}
                          onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-slate-500">
                          Page {bankPage} of {bankPagination.totalPages}
                        </span>
                        <button
                          disabled={bankPage >= bankPagination.totalPages}
                          onClick={() => setBankPage((p) => p + 1)}
                          className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------- METHOD A: SPREADSHEET / CSV UPLOAD ---------- */}
              {activeQuestionTab === 'csv' && (
                <div className="space-y-5 max-w-3xl mx-auto">
                  <div className="bg-slate-50/60 dark:bg-slate-850 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Upload Questions via CSV File
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                        Upload standard question spreadsheet. ReadyUp parses and validates questions before adding to the blueprint.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <label className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer">
                        <span>{csvParsing ? 'Parsing File...' : 'Choose CSV File'}</span>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleCsvFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => coordinatorService.downloadTemplate('csv')}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Template</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="saveCsvToBank"
                        checked={saveCsvQuestionsToBank}
                        onChange={(e) => setSaveCsvQuestionsToBank(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <label htmlFor="saveCsvToBank" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        Also store parsed questions into the reusable Question Bank
                      </label>
                    </div>
                  </div>

                  {/* CSV Preview & Row-level Errors */}
                  {csvPreviewData && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            File Parse Results: {csvPreviewData.fileName}
                          </h4>
                          <div className="flex items-center gap-3 text-xs mt-1">
                            <span className="text-emerald-600 font-bold">
                              ✓ {csvPreviewData.validRowsCount} Valid Rows
                            </span>
                            {csvPreviewData.invalidRowsCount > 0 && (
                              <span className="text-rose-500 font-bold">
                                ✗ {csvPreviewData.invalidRowsCount} Errors
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCsvQuestionsToTest}
                          disabled={!csvPreviewData.validRowsCount}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add {csvPreviewData.validRowsCount} Questions to Blueprint</span>
                        </button>
                      </div>

                      {/* Display Row Errors if any */}
                      {csvPreviewData.errors?.length > 0 && (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                          <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            <span>Validation Errors in File (These rows will be skipped):</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-rose-600 dark:text-rose-400">
                            {csvPreviewData.errors.map((err, i) => (
                              <div key={i}>
                                Row {err.rowNumber || err.row}: {err.error || err.messages?.join(', ')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sample rows preview */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Preview Sample ({Math.min(3, csvPreviewData.validRows?.length || 0)} of {csvPreviewData.validRowsCount}):
                        </div>
                        <div className="space-y-2">
                          {csvPreviewData.validRows?.slice(0, 3).map((r, i) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {r.questionId}: {r.questionText}
                              </div>
                              <div className="text-[11px] text-slate-400 flex gap-2">
                                <span>Correct: <b className="text-emerald-600">{r.correctOption}</b></span>
                                <span>•</span>
                                <span>{r.category}</span>
                                <span>•</span>
                                <span>{r.difficulty}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ---------- METHOD C: MANUAL QUESTION ENTRY ---------- */}
              {activeQuestionTab === 'manual' && (
                <form onSubmit={handleAddManualQuestion} className="space-y-4 max-w-3xl mx-auto bg-slate-50/50 dark:bg-slate-850 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-teal-600" />
                        Manual Multiple-Choice Question Entry
                      </h4>
                      <p className="text-xs text-slate-500">
                        Add individual questions directly into this mock test blueprint.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Question Text <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Type question stem..."
                      value={manualForm.questionText}
                      onChange={(e) => setManualForm({ ...manualForm, questionText: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const fieldName = `option${letter}`;
                      const isCorrect = manualForm.correctOption === letter;

                      return (
                        <div
                          key={letter}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Option {letter} {['A', 'B'].includes(letter) && <span className="text-rose-500">*</span>}
                            </span>
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                              <input
                                type="radio"
                                name="correctOptionRadio"
                                checked={isCorrect}
                                onChange={() => setManualForm({ ...manualForm, correctOption: letter })}
                                className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span>Correct Answer</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            required={['A', 'B'].includes(letter)}
                            placeholder={`Enter text for Option ${letter}...`}
                            value={manualForm[fieldName]}
                            onChange={(e) => setManualForm({ ...manualForm, [fieldName]: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Category
                      </label>
                      <select
                        value={manualForm.category}
                        onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                        <option value="Logical Reasoning">Logical Reasoning</option>
                        <option value="Verbal Ability">Verbal Ability</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Topic Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Time and Work"
                        value={manualForm.topic}
                        onChange={(e) => setManualForm({ ...manualForm, topic: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Difficulty
                      </label>
                      <select
                        value={manualForm.difficulty}
                        onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Marks
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={manualForm.marks}
                        onChange={(e) => setManualForm({ ...manualForm, marks: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Explanation (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Step-by-step formula or explanation for student review..."
                      value={manualForm.explanation}
                      onChange={(e) => setManualForm({ ...manualForm, explanation: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualForm.saveToBank}
                        onChange={(e) => setManualForm({ ...manualForm, saveToBank: e.target.checked })}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span>Make this question available in Question Bank for future tests</span>
                    </label>

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Blueprint</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================= STEP 3: CONSOLIDATED REVIEW & FINALIZE ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Questions</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {testQuestions.length}
                  </div>
                  <div className="text-[10px] text-teal-600 mt-1">Full Assessment Blueprint</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Total Marks</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {totalCalculatedMarks}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Pass Cutoff: {Math.round((totalCalculatedMarks * passingScore) / 100)} marks ({passingScore}%)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Duration</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {durationMinutes}m
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Countdown server timer</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Target Depts</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                    {selectedDepartments.includes('ALL') ? 'All Departments' : `${selectedDepartments.length} Dept(s)`}
                  </div>
                  <div className="text-[10px] text-teal-600 mt-1">Authorized access list</div>
                </div>
              </div>

              {/* Blueprint Distributions */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 mr-2">Question Sources:</span>
                  <div className="inline-flex gap-2">
                    {Object.entries(sourceDistribution).map(([src, count]) => (
                      <span key={src} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {src}: <b>{count}</b>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 mr-2">Difficulty:</span>
                  <div className="inline-flex gap-2">
                    <span className="text-emerald-600">Easy: {difficultyDistribution.easy}</span>
                    <span>•</span>
                    <span className="text-amber-600">Medium: {difficultyDistribution.medium}</span>
                    <span>•</span>
                    <span className="text-rose-600">Hard: {difficultyDistribution.hard}</span>
                  </div>
                </div>
              </div>

              {/* Consolidated Question List (Reorder, Review, Remove) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Consolidated Question List ({testQuestions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More Questions</span>
                  </button>
                </div>

                {testQuestions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No questions currently in this test blueprint.
                    </p>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="mt-2 px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold"
                    >
                      Go to Step 2 & Add Questions
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {testQuestions.map((q, idx) => (
                      <div
                        key={q._id || idx}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-start gap-3 group"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {q.questionId}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900">
                              {q.source || 'Question'}
                            </span>
                            <span className="text-[11px] text-slate-400">{q.topic || 'General'}</span>
                            <Badge variant={q.difficulty === 'easy' ? 'emerald' : q.difficulty === 'hard' ? 'rose' : 'amber'}>
                              {q.difficulty}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {q.marks || 1} mark(s)
                            </span>
                          </div>

                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                            {q.questionText}
                          </p>
                        </div>

                        {/* Reorder and Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, -1)}
                            title="Move Up"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === testQuestions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 1)}
                            title="Move Down"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            title="Remove Question"
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || !title.trim()}
                  onClick={() => handleSaveTest('draft')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (!title.trim()) {
                        addToast({ title: 'Title Required', message: 'Please enter a test title.', type: 'error' });
                        return;
                      }
                      setCurrentStep(2);
                    } else if (currentStep === 2) {
                      setCurrentStep(3);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveTest('draft')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || testQuestions.length === 0}
                  onClick={() => handleSaveTest('published')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Mock Test...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Publish Mock Test</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
