export interface BlendShapeData {
  categoryName: string;
  score: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceData {
  blendshapes: BlendShapeData[];
  landmarks: Landmark[];
  transformMatrix: number[]; // For head pose if needed
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING_MODEL = 'LOADING_MODEL',
  TRACKING = 'TRACKING',
  ERROR = 'ERROR',
}

export interface AnalysisResult {
  emotion: string;
  description: string;
  actingTips: string;
}
