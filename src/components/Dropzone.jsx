import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Upload, FileText, Zap, Database, AlertCircle, Loader2 } from 'lucide-react';
import { useLogs } from '../context/LogContext';

export default function Dropzone() {
  const { processLogs, loadSampleData, isLoading, error } = useLogs();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validExtensions = ['.log', '.txt', '.json'];

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFile = useCallback(async (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert('Invalid file type. Please upload .log, .txt, or .json files.');
      return;
    }
    const text = await file.text();
    processLogs(text, file.name);
  }, [processLogs]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <Shield className="w-12 h-12 text-neon-cyan" />
            <div className="absolute inset-0 w-12 h-12 bg-neon-cyan/20 rounded-full blur-xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-white">Aegis</span>
            <span className="neon-text">Log</span>
            <span className="text-white/60 text-2xl md:text-3xl ml-1">Analytics</span>
          </h1>
        </div>
        <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
          AI-Driven Cyber Threat &amp; Security Log Intelligence Platform.
          <br />
          <span className="text-slate-500">Upload your server logs or load sample data to begin analysis.</span>
        </p>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-2xl"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center group
            ${isDragOver
              ? 'border-neon-cyan bg-neon-cyan/5 shadow-neon-cyan'
              : 'border-slate-700 hover:border-neon-cyan/40 hover:bg-white/[0.02]'
            }
            ${isLoading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-neon-cyan animate-spin" />
              <p className="text-neon-cyan font-mono text-sm">Processing ETL Pipeline...</p>
              <div className="w-48 h-1 bg-obsidian-400 rounded-full overflow-hidden">
                <div className="h-full bg-neon-cyan rounded-full animate-shimmer" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <>
              <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${isDragOver ? 'text-neon-cyan' : 'text-slate-500 group-hover:text-neon-cyan/70'}`} />
              <p className="text-lg font-medium text-slate-300 mb-2">
                {isDragOver ? 'Release to analyze' : 'Drag & drop your log files here'}
              </p>
              <p className="text-sm text-slate-500 mb-4">or click to browse</p>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                <FileText className="w-3.5 h-3.5" />
                <span>Supports .log, .txt, .json files</span>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-4 py-3 max-w-2xl w-full"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-mono">{error}</p>
        </motion.div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 my-8 w-full max-w-2xl">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <span className="text-xs text-slate-600 font-mono uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      {/* Sample Data Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        onClick={loadSampleData}
        disabled={isLoading}
        className="group relative flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-sm
          bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10
          border border-neon-cyan/20 hover:border-neon-cyan/40
          text-neon-cyan hover:text-white
          transition-all duration-300
          hover:shadow-neon-cyan
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-cyan/5 to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Database className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Load Sample Cyber Logs</span>
        <Zap className="w-4 h-4 relative z-10 text-neon-purple" />
      </motion.button>

      {/* Feature badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="flex flex-wrap items-center justify-center gap-3 mt-10 text-xs"
      >
        {['ETL Pipeline', 'Real-time Analytics', 'AI Insights', 'Threat Detection'].map((feature) => (
          <span key={feature} className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-slate-800 text-slate-500">
            {feature}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
