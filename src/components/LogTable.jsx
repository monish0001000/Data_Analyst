import React, { useState, useMemo } from 'react';
import { TableProperties, Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLogs } from '../context/LogContext';

const PAGE_SIZE = 20;

function getStatusBadge(statusCode) {
  const code = typeof statusCode === 'number' ? statusCode : parseInt(statusCode, 10);
  if (isNaN(code)) return 'badge-info';
  if (code < 400) return 'badge-success';
  if (code < 500) return 'badge-warning';
  return 'badge-error';
}

const COLUMNS = [
  { key: 'timestamp', label: 'Timestamp', mono: true },
  { key: 'sourceIP', label: 'Source IP', mono: true },
  { key: 'method', label: 'Method', mono: false },
  { key: 'endpoint', label: 'Endpoint', mono: true },
  { key: 'statusCode', label: 'Status', mono: true },
  { key: 'bytes', label: 'Size', mono: true },
];

const METHOD_COLORS = {
  GET: 'text-neon-cyan bg-neon-cyan/10',
  POST: 'text-[#00FF88] bg-[#00FF88]/10',
  PUT: 'text-[#FFD600] bg-[#FFD600]/10',
  DELETE: 'text-neon-red bg-neon-red/10',
  PATCH: 'text-neon-purple bg-neon-purple/10',
};

export default function LogTable() {
  const { parsedData } = useLogs();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!parsedData) return [];
    let data = [...parsedData];

    // Text search on endpoint, sourceIP, method
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((row) =>
        (row.endpoint && row.endpoint.toLowerCase().includes(q)) ||
        (row.sourceIP && row.sourceIP.toLowerCase().includes(q)) ||
        (row.method && row.method.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      data = data.filter((row) => {
        if (statusFilter === 'success') return row.statusCode < 400;
        if (statusFilter === 'client') return row.statusCode >= 400 && row.statusCode < 500;
        if (statusFilter === 'server') return row.statusCode >= 500;
        return true;
      });
    }

    // Method filter
    if (methodFilter !== 'all') {
      data = data.filter((row) => row.method && row.method.toUpperCase() === methodFilter);
    }

    // Sorting
    if (sortCol) {
      data.sort((a, b) => {
        let aVal = a[sortCol] ?? '';
        let bVal = b[sortCol] ?? '';

        if (sortCol === 'statusCode' || sortCol === 'bytes') {
          aVal = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
          bVal = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [parsedData, search, statusFilter, methodFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const SortIcon = ({ colKey }) => {
    if (sortCol !== colKey) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-neon-cyan" />
      : <ChevronDown className="w-3 h-3 text-neon-cyan" />;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString('en-US', {
        month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
    } catch {
      return ts;
    }
  };

  const formatSize = (bytes) => {
    const n = typeof bytes === 'number' ? bytes : parseInt(bytes, 10);
    if (isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  };

  const renderCell = (row, col) => {
    switch (col.key) {
      case 'timestamp':
        return (
          <td key={col.key} className="px-4 py-2.5 text-slate-400 font-mono text-xs whitespace-nowrap">
            {formatTimestamp(row.timestamp)}
          </td>
        );
      case 'sourceIP':
        return (
          <td key={col.key} className="px-4 py-2.5 text-slate-300 font-mono text-xs whitespace-nowrap">
            {row.sourceIP || '—'}
          </td>
        );
      case 'method':
        return (
          <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${METHOD_COLORS[row.method] || 'text-slate-400 bg-white/5'}`}>
              {row.method || '—'}
            </span>
          </td>
        );
      case 'endpoint':
        return (
          <td key={col.key} className="px-4 py-2.5 text-slate-300 font-mono text-xs max-w-[250px] truncate" title={row.endpoint}>
            {row.endpoint || '—'}
          </td>
        );
      case 'statusCode':
        return (
          <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
            <span className={`${getStatusBadge(row.statusCode)} font-mono text-xs`}>
              {row.statusCode || '—'}
            </span>
          </td>
        );
      case 'bytes':
        return (
          <td key={col.key} className="px-4 py-2.5 text-slate-400 font-mono text-xs whitespace-nowrap">
            {formatSize(row.bytes)}
          </td>
        );
      default:
        return <td key={col.key} className="px-4 py-2.5 text-slate-400 text-xs">—</td>;
    }
  };

  return (
    <div className="glass-panel p-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-5">
        <TableProperties className="w-5 h-5 text-neon-cyan" />
        <h2 className="text-base font-semibold text-white">Log Entries</h2>
        <span className="text-xs text-slate-500 ml-2 font-mono">
          {filtered.length.toLocaleString()} results
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search endpoint, IP, method..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-slate-700
              text-sm text-slate-300 font-mono placeholder:text-slate-600
              focus:outline-none focus:border-neon-cyan/40 focus:ring-1 focus:ring-neon-cyan/20
              transition-colors duration-200"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-slate-700
            text-sm text-slate-300 font-mono
            focus:outline-none focus:border-neon-cyan/40
            transition-colors duration-200 cursor-pointer appearance-none"
        >
          <option value="all">All Status</option>
          <option value="success">Success (1xx–3xx)</option>
          <option value="client">Client Error (4xx)</option>
          <option value="server">Server Error (5xx)</option>
        </select>

        {/* Method Filter */}
        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-slate-700
            text-sm text-slate-300 font-mono
            focus:outline-none focus:border-neon-cyan/40
            transition-colors duration-200 cursor-pointer appearance-none"
        >
          <option value="all">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.02] border-b border-slate-800">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-300 transition-colors duration-150"
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No matching log entries found.
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={row.id || i}
                  className={`transition-colors duration-150 hover:bg-white/[0.03]
                    ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}`}
                >
                  {COLUMNS.map((col) => renderCell(row, col))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/40">
          <p className="text-xs text-slate-500 font-mono">
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-white/[0.04] border border-slate-700 text-slate-400
                hover:bg-white/[0.08] hover:text-white
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-150"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-xs text-slate-500 font-mono px-2">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-white/[0.04] border border-slate-700 text-slate-400
                hover:bg-white/[0.08] hover:text-white
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-150"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
