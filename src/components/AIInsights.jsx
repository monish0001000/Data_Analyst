import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Key, ChevronDown, ChevronUp, Loader2, Sparkles, Terminal } from 'lucide-react';
import { useLogs } from '../context/LogContext';

function useTypewriter(text, speed = 8) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      setIsComplete(false);
      return;
    }

    setDisplayed('');
    setIsComplete(false);
    let index = 0;

    const timer = setInterval(() => {
      index++;
      if (index >= text.length) {
        setDisplayed(text);
        setIsComplete(true);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, index));
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, isComplete };
}

function MarkdownRenderer({ content }) {
  const elements = useMemo(() => {
    if (!content) return [];

    const lines = content.split('\n');
    const result = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.trim().startsWith('```')) {
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        result.push(
          <pre
            key={key++}
            className="my-3 p-4 rounded-lg bg-black/40 border border-slate-800 text-neon-cyan text-xs font-mono overflow-x-auto"
          >
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        result.push(
          <hr key={key++} className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
        );
        i++;
        continue;
      }

      // H2 heading
      if (line.trim().startsWith('## ')) {
        const text = line.trim().replace(/^## /, '');
        result.push(
          <h2 key={key++} className="text-lg font-bold text-neon-cyan mt-5 mb-2 flex items-center gap-2">
            {renderInline(text)}
          </h2>
        );
        i++;
        continue;
      }

      // H3 heading
      if (line.trim().startsWith('### ')) {
        const text = line.trim().replace(/^### /, '');
        result.push(
          <h3 key={key++} className="text-base font-semibold text-neon-purple mt-4 mb-1.5">
            {renderInline(text)}
          </h3>
        );
        i++;
        continue;
      }

      // H1 heading
      if (line.trim().startsWith('# ')) {
        const text = line.trim().replace(/^# /, '');
        result.push(
          <h1 key={key++} className="text-xl font-bold text-white mt-5 mb-2">
            {renderInline(text)}
          </h1>
        );
        i++;
        continue;
      }

      // Bullet point
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletLines = [];
        while (
          i < lines.length &&
          (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
        ) {
          bulletLines.push(lines[i].trim().replace(/^[-*] /, ''));
          i++;
        }
        result.push(
          <ul key={key++} className="my-2 space-y-1.5 ml-1">
            {bulletLines.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-neon-cyan mt-1 text-xs select-none">▸</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        result.push(<div key={key++} className="h-2" />);
        i++;
        continue;
      }

      // Normal paragraph
      result.push(
        <p key={key++} className="text-sm text-slate-300 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return result;
  }, [content]);

  return <div>{elements}</div>;
}

function renderInline(text) {
  if (!text) return text;

  // Split by bold markers **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline code `...`
    const codeParts = part.split(/(`[^`]+`)/g);
    if (codeParts.length > 1) {
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code key={`${i}-${j}`} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-neon-cyan text-xs font-mono">
              {cp.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={`${i}-${j}`}>{cp}</React.Fragment>;
      });
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function AIInsights() {
  const { aiInsights, isAnalyzing, analyzeWithAI, apiKey, setApiKey } = useLogs();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey || '');

  const { displayed, isComplete } = useTypewriter(aiInsights || '', 8);

  const handleKeySubmit = () => {
    setApiKey(localKey.trim());
  };

  return (
    <div className="glass-panel p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-5 h-5 text-neon-purple" />
            <div className="absolute inset-0 bg-neon-purple/20 rounded-full blur-md" />
          </div>
          <h2 className="text-base font-semibold text-white">Aegis AI Intelligence</h2>
        </div>

        {/* API Key Toggle */}
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{apiKey ? 'Key set ✓' : 'API Key'}</span>
          {showKeyInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* API Key Input (Collapsible) */}
      <AnimatePresence>
        {showKeyInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mb-5 p-4 rounded-lg bg-white/[0.02] border border-slate-800">
              <p className="text-xs text-slate-500 mb-3">
                Optional: Add Gemini API key for enhanced AI analysis. Works without it too!
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter Gemini API key..."
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-slate-700
                    text-sm text-slate-300 font-mono placeholder:text-slate-600
                    focus:outline-none focus:border-neon-purple/40 focus:ring-1 focus:ring-neon-purple/20
                    transition-colors duration-200"
                />
                <button
                  onClick={handleKeySubmit}
                  className="px-4 py-2 rounded-lg text-xs font-medium
                    bg-neon-purple/10 border border-neon-purple/30 text-neon-purple
                    hover:bg-neon-purple/20 hover:border-neon-purple/50
                    transition-all duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button */}
      <button
        onClick={analyzeWithAI}
        disabled={isAnalyzing}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-semibold
          transition-all duration-300
          ${isAnalyzing
            ? 'bg-neon-purple/10 border border-neon-purple/20 text-neon-purple cursor-wait'
            : 'bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border border-neon-purple/30 text-white hover:border-neon-purple/50 hover:shadow-neon-purple hover:from-neon-purple/30 hover:to-neon-cyan/20'
          }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing threat patterns...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 text-neon-purple" />
            <span>Analyze with Aegis AI</span>
          </>
        )}
      </button>

      {/* Results Terminal */}
      {(aiInsights || isAnalyzing) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6"
        >
          <div className="terminal">
            {/* Terminal Header */}
            <div className="terminal-header">
              <div className="flex items-center gap-1.5">
                <div className="terminal-dot bg-[#FF5F56]" />
                <div className="terminal-dot bg-[#FFBD2E]" />
                <div className="terminal-dot bg-[#27C93F]" />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Terminal className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-500 font-mono">aegis-ai@threat-intel</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-5 min-h-[200px]">
              {/* Command line */}
              <div className="flex items-center gap-2 mb-4 text-xs font-mono">
                <span className="text-neon-green">$</span>
                <span className="text-slate-400">analyze --mode=executive</span>
                {isAnalyzing && !aiInsights && (
                  <span className="inline-block w-2 h-4 bg-neon-cyan animate-pulse ml-1" />
                )}
              </div>

              {/* Output */}
              {displayed && (
                <div className="relative">
                  <MarkdownRenderer content={displayed} />
                  {/* Blinking cursor at end */}
                  {!isComplete && (
                    <span className="inline-block w-1.5 h-4 bg-neon-cyan/80 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}

              {/* Loading state when no output yet */}
              {isAnalyzing && !aiInsights && (
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Processing threat intelligence data...</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
