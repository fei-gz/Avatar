import React from 'react';
import { AnalysisResult } from '../types';
import { Sparkles, Activity, Theater } from 'lucide-react';

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  onAnalyze: () => void;
  canAnalyze: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  result, 
  isLoading, 
  onAnalyze, 
  canAnalyze 
}) => {
  return (
    <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl p-4 text-white shadow-2xl z-50 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-cyber-500 flex items-center gap-2">
          <Sparkles size={16} />
          AI Analysis
        </h2>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-gray-400">Gemini 2.5 Flash</span>
        </div>
      </div>

      {!result && !isLoading && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>Capture and analyze your current expression.</p>
        </div>
      )}

      {isLoading && (
        <div className="py-8 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-cyber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-cyber-500">Analyzing expression...</span>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1">Emotion</label>
            <div className="text-xl font-mono text-white font-bold bg-white/5 p-2 rounded border-l-2 border-cyber-500">
              {result.emotion}
            </div>
          </div>
          
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Activity size={12}/> Analysis
            </label>
            <p className="text-sm text-gray-300 leading-relaxed bg-black/40 p-2 rounded">
              {result.description}
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                <Theater size={12}/> Director's Note
            </label>
            <p className="text-sm text-cyber-500 italic border border-cyber-500/20 p-2 rounded bg-cyber-900/20">
              "{result.actingTips}"
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={isLoading || !canAnalyze}
        className={`
          w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all
          flex items-center justify-center gap-2
          ${isLoading || !canAnalyze 
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
            : 'bg-cyber-600 hover:bg-cyber-500 text-black shadow-lg shadow-cyber-500/20 hover:shadow-cyber-500/40 active:transform active:scale-95'}
        `}
      >
        {isLoading ? 'Processing...' : 'Analyze Frame'}
      </button>
    </div>
  );
};
