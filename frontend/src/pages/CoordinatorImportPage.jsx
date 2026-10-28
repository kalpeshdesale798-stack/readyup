import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function CoordinatorImportPage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      addToast({
        title: 'Invalid File Format',
        message: 'Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.',
        type: 'error'
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      addToast({
        title: 'File Too Large',
        message: 'File size must not exceed 10MB.',
        type: 'error'
      });
      return;
    }

    setFile(selectedFile);
    setPreviewData(null);
    setImportSummary(null);
  };

  const handleDownloadTemplate = () => {
    coordinatorService.downloadTemplate('xlsx');
    addToast({
      title: 'Template Downloaded',
      message: 'readyup_questions_template.csv saved to downloads.',
      type: 'info'
    });
  };

  const handlePreviewUpload = async () => {
    if (!file) return;
    setIsPreviewing(true);
    try {
      const data = await coordinatorService.previewImport(file);
      setPreviewData(data);
      addToast({
        title: 'Spreadsheet Parsed',
        message: `${data.validRowsCount} valid rows ready for review.`,
        type: data.invalidRowsCount > 0 ? 'warning' : 'success'
      });
    } catch (err) {
      addToast({
        title: 'Parsing Failed',
        message: err.message || 'Error parsing spreadsheet',
        type: 'error'
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!previewData?.importBatchId) return;
    setIsConfirming(true);
    try {
      const summary = await coordinatorService.confirmImport(previewData.importBatchId);
      setImportSummary(summary);
      addToast({
        title: 'Questions Published!',
        message: `Successfully inserted ${summary.insertedCount} new questions.`,
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Publish Failed',
        message: err.message || 'Error confirming import',
        type: 'error'
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            CONTENT MANAGEMENT
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Spreadsheet Question Import
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Two-stage idempotent import with live syntax verification and preview staging
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-teal-600" />
          <span>Download Standard Template</span>
        </button>
      </div>

      {/* If Import Completed: Show Final Summary Card */}
      {importSummary && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800 card-shadow text-center animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
            Import Confirmed & Published Successfully!
          </h3>
          <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-1">
            Batch ID: <span className="font-mono">{importSummary.importBatchId}</span>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto my-6 text-center">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900">
              <span className="text-[11px] text-slate-400 block">Total Processed</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {importSummary.totalProcessed}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900">
              <span className="text-[11px] text-emerald-600 block">New Inserted</span>
              <span className="text-lg font-bold text-emerald-600">
                +{importSummary.insertedCount}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900">
              <span className="text-[11px] text-amber-600 block">Updated</span>
              <span className="text-lg font-bold text-amber-600">
                {importSummary.updatedCount}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900">
              <span className="text-[11px] text-slate-400 block">Skipped</span>
              <span className="text-lg font-bold text-slate-600">
                {importSummary.skippedCount}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Upload Another Spreadsheet
            </button>
            <button
              onClick={() => navigate('/coordinator/questions')}
              className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              View Question Bank →
            </button>
          </div>
        </div>
      )}

      {/* Stage 1: Upload Dropzone (Form 9) */}
      {!importSummary && (
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase">Stage 1</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select Spreadsheet File
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Accepted: .xlsx, .xls, .csv (Max 10MB)
            </span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              dragActive
                ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 bg-slate-50/50 dark:bg-slate-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              onClick={(e) => {
                e.target.value = null;
              }}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>

            {file ? (
              <div>
                <p className="text-sm font-bold text-teal-700 dark:text-teal-400">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB • Click or drop to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Drag and drop your spreadsheet here, or{' '}
                  <span className="text-teal-600 underline">browse computer</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports Excel workbooks and comma-separated question exports
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Columns required: questionId, questionText, optionA-D, correctOption, explanation, category, topic, difficulty
            </span>
            <button
              onClick={handlePreviewUpload}
              disabled={!file || isPreviewing}
              className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>{isPreviewing ? 'Validating...' : 'Parse & Validate Rows'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stage 2: Preview & Validation Errors (Form 10) */}
      {previewData && !importSummary && (
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase">Stage 2</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Staged Rows Preview & Syntax Verification
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Batch ID: <span className="font-mono">{previewData.importBatchId}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="success">
                {previewData.validRowsCount} Valid Rows
              </Badge>
              {previewData.invalidRowsCount > 0 && (
                <Badge variant="rose">
                  {previewData.invalidRowsCount} Line Errors Flagged
                </Badge>
              )}
            </div>
          </div>

          {/* Validation Errors Report if any */}
          {previewData.errors && previewData.errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>The following rows contain formatting errors and will be skipped:</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pl-6">
                {previewData.errors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-700 dark:text-rose-300">
                    <span className="font-bold">Row {err.rowNumber || err.row}:</span> {err.questionId} — {err.error || (Array.isArray(err.messages) ? err.messages.join(', ') : err.message)} {err.field ? `(Field: ${err.field})` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview Sample Table */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Sample Validated Rows (First 5):
            </span>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Question ID</th>
                    <th className="py-2.5 px-3">Topic</th>
                    <th className="py-2.5 px-3">Difficulty</th>
                    <th className="py-2.5 px-3">Question Text Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(previewData.previewSample || previewData.validRows || previewData.rows || []).slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-600">
                        {row.questionId}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {row.topic}
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        <Badge variant={row.difficulty}>{row.difficulty}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {row.questionText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel & Discard Batch
            </button>

            <button
              onClick={handleConfirmPublish}
              disabled={isConfirming || previewData.validRowsCount === 0}
              className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>{isConfirming ? 'Publishing Questions...' : `Confirm & Publish ${previewData.validRowsCount} Questions`}</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
