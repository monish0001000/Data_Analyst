import React from 'react';
import { useLogs } from './context/LogContext';
import Dashboard from './components/Dashboard';
import Dropzone from './components/Dropzone';

export default function App() {
  const { isParsed } = useLogs();

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10">
        {isParsed ? <Dashboard /> : <Dropzone />}
      </div>
    </div>
  );
}
