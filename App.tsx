
import React, { useState } from 'react';
import { AppState, Variation, ModelCategory } from './types';
import { analyzeClothing, generateVariation } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    originalMimeType: null,
    brandInfo: '',
    isProcessing: false,
    variations: [],
    error: null,
    analysis: null,
  });

  const [currentStep, setCurrentStep] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setState(prev => ({
        ...prev,
        originalImage: base64,
        originalMimeType: file.type,
        variations: [],
        analysis: null,
        error: null
      }));
    };
    reader.readAsDataURL(file);
  };

  const generateVariations = async () => {
    if (!state.originalImage || !state.originalMimeType) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    setCurrentStep('Analyzing garment...');

    try {
      const description = await analyzeClothing(state.originalImage, state.originalMimeType);
      setState(prev => ({ ...prev, analysis: description }));

      const categories = [
        ModelCategory.STUDIO,
        ModelCategory.STREET,
        ModelCategory.EDITORIAL
      ];

      const newVariations: Variation[] = [];

      for (const cat of categories) {
        setCurrentStep(`Generating ${cat} look...`);
        try {
          const result = await generateVariation(
            state.originalImage,
            state.originalMimeType,
            description,
            state.brandInfo,
            cat
          );
          newVariations.push({
            id: Math.random().toString(36).substr(2, 9),
            url: result.url,
            prompt: result.prompt,
            modelType: cat
          });
          setState(prev => ({ ...prev, variations: [...newVariations] }));
        } catch (err: any) {
          console.error(`Error generating ${cat} variation:`, err);
          if (newVariations.length === 0) throw err;
        }
      }

      if (newVariations.length === 0) {
        throw new Error("Failed to generate variations. Try a different image or simpler brand info.");
      }

    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "An unexpected error occurred." }));
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
      setCurrentStep('');
    }
  };

  const downloadAll = async () => {
    for (let i = 0; i < state.variations.length; i++) {
      const v = state.variations[i];
      const link = document.createElement('a');
      link.href = v.url;
      link.download = `lookbook-${v.modelType.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">AI Fashion Lookbook</h1>
        <p className="text-slate-600">Instantly generate professional campaign imagery for your brand.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">1. Upload Item</h2>
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 transition-all hover:border-indigo-400 group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {state.originalImage ? (
                <div className="relative">
                  <img 
                    src={`data:${state.originalMimeType};base64,${state.originalImage}`} 
                    alt="Original" 
                    className="w-full h-48 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <span className="text-white text-sm font-medium">Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Drop item photo</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">2. Campaign Style</h2>
            <textarea
              placeholder="e.g. Minimalist luxury, 90s retro, futuristic, moody editorial..."
              className="w-full p-3 border border-slate-200 rounded-xl h-24 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
              value={state.brandInfo}
              onChange={(e) => setState(prev => ({ ...prev, brandInfo: e.target.value }))}
            />
          </div>

          <button
            onClick={generateVariations}
            disabled={!state.originalImage || state.isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${
              !state.originalImage || state.isProcessing
              ? 'bg-slate-300 cursor-not-allowed shadow-none' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {state.isProcessing ? (
              <span className="flex flex-col items-center justify-center">
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
                <span className="text-[10px] opacity-70 mt-1 uppercase tracking-tighter">{currentStep}</span>
              </span>
            ) : 'Generate Lookbook'}
          </button>

          {state.error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs leading-relaxed">
              <span className="font-bold block mb-1">Error</span>
              {state.error}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-8">
          {state.variations.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Campaign Results</h2>
                  <p className="text-sm text-slate-500">AI-generated fashion variations</p>
                </div>
                <button 
                  onClick={downloadAll}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download All
                </button>
              </div>

              {state.analysis && (
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Garment Analysis</span>
                  </div>
                  <p className="text-slate-700 text-sm italic">"{state.analysis}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {state.variations.map((v) => (
                  <div key={v.id} className="group bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-xl">
                    <div className="aspect-[3/4] overflow-hidden bg-slate-50">
                      <img src={v.url} alt={v.modelType} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{v.modelType}</p>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Optimized Look</p>
                      </div>
                      <a 
                        href={v.url} 
                        download={`lookbook-${v.modelType.toLowerCase()}.png`}
                        className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
              <div className="bg-indigo-50 p-6 rounded-full mb-6">
                <svg className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to create?</h3>
              <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                Upload your apparel photos on the left to generate professional campaign looks instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
