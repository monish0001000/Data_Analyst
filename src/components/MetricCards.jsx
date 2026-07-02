import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, AlertTriangle, HardDrive } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import { formatBytes, formatNumber } from '../utils/etlParser';

function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function MetricCards() {
  const { metrics } = useLogs();
  if (!metrics) return null;

  const cards = [
    {
      title: 'Total Requests',
      value: metrics.totalRequests,
      format: (v) => formatNumber(v),
      icon: Globe,
      color: 'cyan',
      bgGlow: 'from-neon-cyan/10 to-transparent',
      iconColor: 'text-neon-cyan',
      borderColor: 'hover:border-neon-cyan/30',
      shadowColor: 'hover:shadow-neon-cyan',
    },
    {
      title: 'Unique Sources',
      value: metrics.uniqueIPs,
      format: (v) => formatNumber(v),
      icon: Users,
      color: 'purple',
      bgGlow: 'from-neon-purple/10 to-transparent',
      iconColor: 'text-neon-purple',
      borderColor: 'hover:border-neon-purple/30',
      shadowColor: 'hover:shadow-neon-purple',
    },
    {
      title: 'Error Rate',
      value: metrics.errorRate,
      format: (v) => v.toFixed(1) + '%',
      icon: AlertTriangle,
      color: 'red',
      bgGlow: 'from-neon-red/10 to-transparent',
      iconColor: metrics.errorRate > 20 ? 'text-neon-red' : 'text-neon-yellow',
      borderColor: metrics.errorRate > 20 ? 'hover:border-neon-red/30' : 'hover:border-neon-yellow/30',
      shadowColor: metrics.errorRate > 20 ? 'hover:shadow-neon-red' : '',
    },
    {
      title: 'Total Bandwidth',
      value: metrics.totalBandwidth,
      format: (v) => formatBytes(v),
      icon: HardDrive,
      color: 'green',
      bgGlow: 'from-neon-green/10 to-transparent',
      iconColor: 'text-neon-green',
      borderColor: 'hover:border-neon-green/30',
      shadowColor: '',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <MetricCard key={card.title} card={card} index={index} />
      ))}
    </div>
  );
}

function MetricCard({ card, index }) {
  const animatedValue = useCountUp(card.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`glass-panel-hover p-5 relative overflow-hidden group ${card.borderColor} ${card.shadowColor}`}
    >
      {/* Background gradient glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.bgGlow} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.title}</span>
          <card.icon className={`w-5 h-5 ${card.iconColor} opacity-70`} />
        </div>
        <p className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">
          {card.format(animatedValue)}
        </p>
      </div>
    </motion.div>
  );
}
