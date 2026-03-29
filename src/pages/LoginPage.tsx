import { useWorkOSAuth } from '../lib/auth-helpers';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';

export function LoginPage() {
  const { signIn, isLoading } = useWorkOSAuth();

  usePageMeta({
    title: 'Sign In',
    description: 'Sign in to NeuralBi — AI-powered business intelligence. Upload CSV data and get interactive dashboards instantly.',
    canonical: 'https://neuralbi.io/login',
  });

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white flex items-center justify-center rounded-sm">
            <div className="w-6 h-6 bg-black" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">NeuralBi</h1>
        <p className="text-sm text-zinc-500 mb-10 max-w-sm mx-auto">
          AI-powered business intelligence. Upload data, get dashboards, share insights.
        </p>

        <button
          onClick={signIn}
          disabled={isLoading}
          className="px-8 py-3 bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign in to continue
        </button>

        <p className="text-[10px] text-zinc-700 mt-6">
          Secure authentication powered by WorkOS
        </p>
      </motion.div>
    </div>
  );
}
