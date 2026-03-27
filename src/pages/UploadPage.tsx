import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Sparkles, AlertCircle, FileSpreadsheet, ArrowRight, Zap, BarChart3, Brain, PenLine, LayoutDashboard, LogIn } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { parseCSV } from '../lib/csv-parser';
import { generateDashboard, generateDashboardFallback } from '../lib/ai-dashboard-generator';
import { useApp } from '../lib/app-store';
import { useWorkOSAuth } from '../lib/auth-helpers';

type Stage = 'upload' | 'parsing' | 'saving' | 'analyzing' | 'building' | 'done' | 'error';

const STAGE_MESSAGES: Record<string, { title: string; sub: string }> = {
  parsing: { title: 'Reading your data', sub: 'Parsing columns, detecting types...' },
  saving: { title: 'Securing your dataset', sub: 'Storing everything safely...' },
  analyzing: { title: 'AI is thinking', sub: 'Finding patterns, correlations, and insights...' },
  building: { title: 'Building your dashboard', sub: 'Laying out charts and visualizations...' },
  done: { title: 'Your dashboard is ready', sub: 'Redirecting you now...' },
};

export function UploadPage() {
  const [stage, setStage] = useState<Stage>('upload');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDataset, createDashboardFromCharts } = useApp();
  const consumeCredits = useMutation(api.billing.consumeCredits);
  const navigate = useNavigate();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();

  // Floating orbs background animation
  const [orbs] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 200 + Math.random() * 300,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * -20,
    }))
  );

  const { user, accessToken, signIn } = useWorkOSAuth();
  const workosConfigured = !!import.meta.env.VITE_WORKOS_CLIENT_ID;

  const processFile = useCallback(async (fileToProcess: File, userPrompt: string) => {
    setError('');
    setStage('parsing');
    setStatusMsg('Reading and parsing your CSV...');

    try {
      const result = await parseCSV(fileToProcess);

      setStage('saving');
      setStatusMsg('Saving dataset to database...');

      const dataset = {
        fileName: fileToProcess.name,
        fileSize: fileToProcess.size,
        data: result.data,
        schema: result.schema,
        suggestions: [],
        parseErrors: result.errors,
      };
      const datasetId = await uploadDataset(dataset);

      setStage('analyzing');
      setStatusMsg('AI is analyzing your data...');

      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      let genResult;
      let usedAiGeneration = false;

      if (apiKey) {
        try {
          genResult = await generateDashboard(
            result.schema,
            result.data,
            apiKey,
            (status) => setStatusMsg(status),
            userPrompt || undefined,
          );
          usedAiGeneration = true;
        } catch (aiErr) {
          console.warn('AI generation failed, using fallback:', aiErr);
          setStatusMsg('Using smart analysis to build your dashboard...');
          genResult = generateDashboardFallback(result.schema, result.data);
        }

        if (usedAiGeneration && workosConfigured && user && accessToken && isConvexAuthenticated) {
          await consumeCredits({
            feature: 'dashboard_generation',
            units: 1,
            metadata: { datasetName: fileToProcess.name },
          });
        }
      } else {
        setStatusMsg('Building dashboard from data analysis...');
        genResult = generateDashboardFallback(result.schema, result.data);
      }

      setStage('building');
      setStatusMsg('Saving dashboard to database...');

      const dashName = fileToProcess.name.replace(/\.csv$/i, '');
      const dashboardId = await createDashboardFromCharts(datasetId, dashName, genResult.charts, genResult.insights);

      setStage('done');
      setStatusMsg('Dashboard ready!');

      setTimeout(() => navigate(`/dashboard/${dashboardId}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setStage('error');
    }
  }, [uploadDataset, createDashboardFromCharts, navigate, consumeCredits, workosConfigured, user, accessToken, isConvexAuthenticated]);

  const handleFileSelect = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      setStage('error');
      return;
    }
    setFileName(f.name);
    setFile(f);
    setError('');
    setStage('upload');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleGenerate = useCallback(() => {
    if (file) processFile(file, prompt);
  }, [file, prompt, processFile]);

  // Allow Enter in textarea only with Cmd/Ctrl
  const handlePromptKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && file) {
      e.preventDefault();
      handleGenerate();
    }
  }, [file, handleGenerate]);

  const isProcessing = !['upload', 'error'].includes(stage);
  const stageIdx = ['parsing', 'saving', 'analyzing', 'building', 'done'].indexOf(stage);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-brand-bg">
      {/* Top nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
            <div className="w-4 h-4 bg-black" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">NeuralBi</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboards"
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboards</span>
          </Link>

          {workosConfigured && !user && (
            <button
              onClick={signIn}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </button>
          )}

          {user && (
            <Link
              to="/dashboards"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Go to App
            </Link>
          )}
        </div>
      </nav>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {orbs.map((orb) => (
          <motion.div
            key={orb.id}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              background: `radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
            animate={{
              x: [0, 80, -60, 40, 0],
              y: [0, -60, 40, -80, 0],
            }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: 'linear',
              delay: orb.delay,
            }}
          />
        ))}
        {/* Gradient glow behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-xl px-6 flex-1 flex flex-col justify-center mx-auto">
        <AnimatePresence mode="wait">
          {!isProcessing ? (
            <motion.div
              key="upload-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Hero copy */}
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-4">
                Drop a CSV.<br />
                <span className="text-zinc-500">Get a dashboard.</span>
              </h1>
              <p className="text-base text-zinc-500 mb-10 max-w-md leading-relaxed">
                Upload any spreadsheet and watch AI turn raw numbers into
                beautiful, interactive charts — in seconds, not hours.
              </p>

              {/* Upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  group relative cursor-pointer rounded-lg border border-zinc-800/80 p-6
                  transition-all duration-300
                  ${dragOver ? 'border-white/40 bg-white/[0.04]' : 'hover:border-zinc-700 hover:bg-white/[0.02]'}
                  ${stage === 'error' ? 'border-rose-900/60' : ''}
                `}
              >
                {!file ? (
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300
                      ${dragOver ? 'bg-white/10' : 'bg-zinc-900 group-hover:bg-zinc-800'}
                    `}>
                      <Upload className={`w-5 h-5 transition-colors duration-300 ${dragOver ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-300 font-medium">
                        Drag & drop your CSV here
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        or click to browse files
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">{fileName}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">Click to change file</p>
                    </div>
                  </div>
                )}

                {stage === 'error' && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-rose-900/30">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-xs text-rose-400">{error}</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
                className="hidden"
              />

              {/* Optional prompt toggle */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setShowPrompt((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${showPrompt ? 'text-zinc-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  {showPrompt ? 'Hide prompt' : 'Add instructions'}
                </button>
              </div>

              <AnimatePresence>
                {showPrompt && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      autoFocus
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handlePromptKeyDown}
                      placeholder="e.g. Focus on revenue trends by region..."
                      rows={2}
                      className="mt-2 w-full bg-zinc-900/50 border border-zinc-800/80 rounded-lg px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate button */}
              <motion.button
                onClick={handleGenerate}
                disabled={!file}
                className={`
                  mt-4 w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-300
                  ${file
                    ? 'bg-white text-black hover:bg-zinc-200 cursor-pointer'
                    : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800/50'
                  }
                `}
                whileTap={file ? { scale: 0.985 } : {}}
              >
                <Sparkles className="w-4 h-4" />
                Generate Dashboard
                {file && <ArrowRight className="w-4 h-4" />}
              </motion.button>

              {/* Trust signals */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-[11px] text-zinc-700">
                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> Instant analysis</span>
                <span className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> 10+ chart types</span>
                <span className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> AI-powered</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              {/* Animated orb */}
              <div className="relative w-32 h-32 mb-8">
               
                <motion.div
                  className="absolute inset-4 rounded-full"
                  style={{
                    background: stage === 'done'
                      ? 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                  }}
                  animate={{ scale: [1.1, 0.9, 1.1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {stage === 'done' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <motion.path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        />
                      </svg>
                    </motion.div>
                  ) : (
                    <Sparkles className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>

              {/* Stage text */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className={`text-2xl font-bold mb-2 ${stage === 'done' ? 'text-emerald-400' : 'text-white'}`}>
                    {STAGE_MESSAGES[stage]?.title || statusMsg}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {STAGE_MESSAGES[stage]?.sub || ''}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Progress bar */}
              <div className="w-full max-w-xs mt-8">
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${stage === 'done' ? 'bg-emerald-500' : 'bg-white'}`}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.max(((stageIdx + 1) / 5) * 100, 5)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                {/* Step labels */}
                <div className="flex justify-between mt-3">
                  {['Parse', 'Save', 'Analyze', 'Build', 'Done'].map((step, i) => (
                    <span
                      key={step}
                      className={`text-[10px] uppercase tracking-wider transition-colors duration-300 ${
                        i <= stageIdx ? (stage === 'done' ? 'text-emerald-500' : 'text-white') : 'text-zinc-800'
                      }`}
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>

              {/* File name */}
              {fileName && (
                <p className="text-xs text-zinc-700 mt-6">{fileName}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
