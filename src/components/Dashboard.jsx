import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, RotateCcw, Activity } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import MetricCards from './MetricCards';
import Charts from './Charts';
import LogTable from './LogTable';
import AIInsights from './AIInsights';

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Dashboard() {
  const { fileName, parsedData, reset } = useLogs();

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-obsidian/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-neon-cyan" />
              <div className="absolute inset-0 bg-neon-cyan/20 rounded-full blur-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-white">Aegis</span>
                <span className="neon-text">Log</span>
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-slate-800">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-400 font-mono">{fileName}</span>
              <span className="text-xs text-neon-cyan font-mono">({parsedData.length.toLocaleString()} entries)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <Activity className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-green-400">● Pipeline Active</span>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-white/[0.05] hover:bg-white/[0.08] border border-slate-700 hover:border-slate-600
                text-slate-300 hover:text-white transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8"
      >
        <motion.div variants={fadeUp}>
          <MetricCards />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Charts />
        </motion.div>
        <motion.div variants={fadeUp}>
          <LogTable />
        </motion.div>
        <motion.div variants={fadeUp}>
          <AIInsights />
        </motion.div>
      </motion.main>
    </div>
  );
}
