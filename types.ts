
export interface Variation {
  id: string;
  url: string;
  prompt: string;
  modelType: string;
}

export interface AppState {
  originalImage: string | null;
  originalMimeType: string | null;
  brandInfo: string;
  isProcessing: boolean;
  variations: Variation[];
  error: string | null;
  analysis: string | null;
}

export enum ModelCategory {
  STUDIO = 'High-fashion studio',
  STREET = 'Urban street style',
  LIFESTYLE = 'Casual lifestyle',
  EDITORIAL = 'Professional editorial'
}
