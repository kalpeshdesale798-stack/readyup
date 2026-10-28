import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, FileSpreadsheet, ArrowLeft, UploadCloud } from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import Badge from '../components/common/Badge';

export default function CoordinatorHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await coordinatorService.getImportHistory();
        setHistory(res || []);
      } catch (err) {
        console.error('Failed to load import history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            AUDIT TRAIL
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Spreadsheet Import History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical logs of all bulk question uploads and database commits
          </p>
        </div>

        <button
          onClick={() => navigate('/coordinator/import')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Spreadsheet</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Batch ID</th>
                <th className="py-3.5 px-4">File Name</th>
                <th className="py-3.5 px-4">Uploaded At</th>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Rows</th>
                <th className="py-3.5 px-4">Inserted</th>
                <th className="py-3.5 px-4">Updated</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((item) => (
                <tr key={item.importBatchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-600">
                    {item.importBatchId}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {item.filename}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(item.uploadedAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {item.uploaderName}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {item.totalRows}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-600 font-bold">
                    +{item.insertedCount}
                  </td>
                  <td className="py-3.5 px-4 text-amber-600 font-bold">
                    {item.updatedCount}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={item.status === 'published' ? 'Passed' : 'Needs Review'}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
