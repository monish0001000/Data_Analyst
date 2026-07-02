// ============================================================================
// AegisLog-Analytics — Log Context (Global State Management)
// React Context + useReducer for managing log data, metrics, and AI insights
// ============================================================================

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { parseLogFile, computeMetrics } from '../utils/etlParser';
import { generateAIInsights } from '../utils/aiEngine';
import { getSampleLogsAsText } from '../utils/sampleData';

const LogContext = createContext(null);

const initialState = {
  rawText: '',
  fileName: '',
  parsedData: [],
  metrics: null,
  parseErrors: [],
  aiInsights: '',
  isLoading: false,
  isAnalyzing: false,
  isParsed: false,
  error: null,
  apiKey: '',
};

function logReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_RAW_TEXT':
      return { ...state, rawText: action.payload.text, fileName: action.payload.fileName };
    case 'PARSE_COMPLETE':
      return {
        ...state,
        parsedData: action.payload.parsedData,
        metrics: action.payload.metrics,
        parseErrors: action.payload.errors,
        isParsed: true,
        isLoading: false,
        aiInsights: '',
      };
    case 'SET_AI_INSIGHTS':
      return { ...state, aiInsights: action.payload, isAnalyzing: false };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, isAnalyzing: false };
    case 'RESET':
      return { ...initialState, apiKey: state.apiKey };
    default:
      return state;
  }
}

export function LogProvider({ children }) {
  const [state, dispatch] = useReducer(logReducer, initialState);

  const processLogs = useCallback(async (rawText, fileName = 'upload.log') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_RAW_TEXT', payload: { text: rawText, fileName } });

    try {
      // Simulate brief processing delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const ext = fileName.split('.').pop()?.toLowerCase() || 'log';
      const { parsedData, errors } = parseLogFile(rawText, ext);

      if (parsedData.length === 0) {
        throw new Error('No valid log entries found. Please check the file format.');
      }

      const metrics = computeMetrics(parsedData);
      dispatch({ type: 'PARSE_COMPLETE', payload: { parsedData, metrics, errors } });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  const loadSampleData = useCallback(async () => {
    const sampleText = getSampleLogsAsText();
    await processLogs(sampleText, 'sample_cyber_logs.log');
  }, [processLogs]);

  const analyzeWithAI = useCallback(async () => {
    if (!state.metrics) return;
    dispatch({ type: 'SET_ANALYZING', payload: true });
    try {
      const insights = await generateAIInsights(state.metrics, state.parsedData, state.apiKey || null);
      dispatch({ type: 'SET_AI_INSIGHTS', payload: insights });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'AI analysis failed: ' + err.message });
    }
  }, [state.metrics, state.parsedData, state.apiKey]);

  const setApiKey = useCallback((key) => {
    dispatch({ type: 'SET_API_KEY', payload: key });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <LogContext.Provider value={{
      ...state,
      processLogs,
      loadSampleData,
      analyzeWithAI,
      setApiKey,
      reset,
    }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
}
