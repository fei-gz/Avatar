import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { FaceCanvas } from './components/FaceCanvas';
import { BlendShapeBars } from './components/BlendShapeBars';
import { AnalysisPanel } from './components/AnalysisPanel';
import { AppState, FaceData, AnalysisResult } from './types';
import { analyzeExpression } from './services/geminiService';
import { Camera, Video } from 'lucide-react';

export default function App() {
  const webcamRef = useRef<Webcam>(null);
  const [appState, setAppState] = useState<AppState>(AppState.LOADING_MODEL);
  const [faceData, setFaceData] = useState<FaceData | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastVideoTime = useRef<number>(-1);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    const initFaceLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setFaceLandmarker(landmarker);
        setAppState(AppState.IDLE);
      } catch (error) {
        console.error("Failed to load FaceLandmarker", error);
        setAppState(AppState.ERROR);
      }
    };
    initFaceLandmarker();
  }, []);

  // Tracking Loop
  const animate = useCallback(() => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      faceLandmarker
    ) {
      setAppState(AppState.TRACKING);
      const video = webcamRef.current.video;
      const startTimeMs = performance.now();

      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        try {
          const results = faceLandmarker.detectForVideo(video, startTimeMs);

          if (results.faceBlendshapes && results.faceBlendshapes.length > 0 && results.faceLandmarks && results.faceLandmarks.length > 0) {
             // We only take the first face
             setFaceData({
               blendshapes: results.faceBlendshapes[0].categories,
               landmarks: results.faceLandmarks[0],
               transformMatrix: results.facialTransformationMatrixes?.[0]?.data || []
             });
          }
        } catch (e) {
          console.warn("Detection error:", e);
        }
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [faceLandmarker]);

  useEffect(() => {
    if (faceLandmarker) {
        requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [faceLandmarker, animate]);

  // Handle Gemini Analysis
  const handleAnalyze = async () => {
    if (!webcamRef.current || !faceData) return;
    
    setIsAnalyzing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture webcam frame");

      // Format top blend shapes for context
      const topShapes = faceData.blendshapes
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => `${s.categoryName}: ${(s.score * 100).toFixed(1)}%`)
        .join(', ');

      const result = await analyzeExpression(imageSrc, topShapes);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Check API Key configuration.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex">
      {/* Left Panel: 3D Visualization */}
      <div className="flex-1 relative border-r border-gray-800">
        <FaceCanvas faceData={faceData} />
        
        {/* HUD Elements */}
        {faceData && <BlendShapeBars data={faceData.blendshapes} />}
        
        <div className="absolute bottom-6 left-6 z-10">
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase font-mono">
            Face<span className="text-cyber-500">Forge</span>
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">
             v1.0.0 • GEMINI ENHANCED • MEDIAPIPE CORE
          </p>
        </div>
      </div>

      {/* Right Panel: Webcam & Controls (Smaller, often sidebar) */}
      <div className="w-80 lg:w-96 bg-gray-900 border-l border-gray-800 relative flex flex-col z-20 shadow-2xl">
        
        {/* Webcam Feed */}
        <div className="relative aspect-video bg-black overflow-hidden border-b border-gray-800">
            {appState === AppState.LOADING_MODEL && (
                <div className="absolute inset-0 flex items-center justify-center text-cyber-500 text-xs font-mono uppercase animate-pulse">
                    Initializing Vision Core...
                </div>
            )}
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: "user"
                }}
                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${appState === AppState.TRACKING ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-mono text-white/80 uppercase">
                    {appState === AppState.TRACKING ? 'Live Feed' : 'Offline'}
                </span>
            </div>
        </div>

        {/* Gemini Analysis Module */}
        <div className="flex-1 p-6 relative overflow-y-auto">
             <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-500 to-transparent opacity-20"></div>
             
             <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Video size={14} /> Control Deck
             </h2>
             
             <div className="space-y-6">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5">
                   <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                     Capture your expression and let Gemini analyze your micro-expressions and emotion.
                   </p>
                   
                   <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || appState !== AppState.TRACKING}
                    className={`
                      w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all
                      flex items-center justify-center gap-2
                      ${isAnalyzing || appState !== AppState.TRACKING
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-cyber-600 hover:bg-cyber-500 text-black shadow-lg shadow-cyber-500/20 hover:shadow-cyber-500/40 active:transform active:scale-95'}
                    `}
                  >
                    {isAnalyzing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black/50 border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Camera size={16} /> Analyze Frame
                        </>
                    )}
                  </button>
                </div>

                {analysisResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                        <div className="bg-gray-800/30 rounded-lg p-4 border border-cyber-500/20">
                            <label className="text-[10px] text-cyber-500 uppercase tracking-widest block mb-1">Detected Emotion</label>
                            <div className="text-2xl font-bold text-white font-mono">{analysisResult.emotion}</div>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Analysis</label>
                            <p className="text-sm text-gray-300 bg-black/20 p-3 rounded border-l-2 border-gray-700">
                                {analysisResult.description}
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Director's Note</label>
                            <p className="text-sm text-cyber-400 italic">
                                "{analysisResult.actingTips}"
                            </p>
                        </div>
                    </div>
                )}
             </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 text-[10px] text-gray-600 text-center">
             Powered by Google Gemini 2.5 Flash & MediaPipe
        </div>
      </div>
    </div>
  );
}