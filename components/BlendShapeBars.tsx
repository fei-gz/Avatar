import React, { useMemo } from 'react';
import { BlendShapeData } from '../types';

interface BlendShapeBarsProps {
  data: BlendShapeData[];
}

export const BlendShapeBars: React.FC<BlendShapeBarsProps> = ({ data }) => {
  // Sort by score descending and take top 10 for display
  const activeShapes = useMemo(() => {
    return [...data]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [data]);

  return (
    <div className="absolute top-4 left-4 w-64 bg-black/60 backdrop-blur-sm p-4 rounded-xl border border-white/10 z-40 pointer-events-none">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Active Blend Shapes</h3>
      <div className="space-y-2">
        {activeShapes.map((shape) => (
          <div key={shape.categoryName} className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono text-gray-300">
              <span>{shape.categoryName}</span>
              <span>{shape.score.toFixed(2)}</span>
            </div>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyber-500 transition-all duration-75 ease-linear"
                style={{ width: `${shape.score * 100}%` }}
              />
            </div>
          </div>
        ))}
        {activeShapes.length === 0 && (
            <div className="text-xs text-gray-600 text-center py-4">Waiting for face tracking...</div>
        )}
      </div>
    </div>
  );
};
