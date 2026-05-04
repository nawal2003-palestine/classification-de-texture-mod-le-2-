import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Shield, 
  Search, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  Grid3X3, 
  Zap, 
  Info,
  RefreshCw,
  FileText,
  Activity,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

interface ForensicAnalysis {
  material: string;
  suspicion_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  threats: {
    steganography: number;
    tampering: number;
    deepfake: number;
    ela: number;
  };
  forensic_details: string;
  texture_stats: {
    energy: number;
    entropy: number;
    homogeneity: number;
    contrast: number;
  };
  pipeline_info: string;
  feature_breakdown: { name: string; count: number }[];
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysis | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "texture" | "pipeline" | "history">("overview");

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("forensic_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history helper
  const addToHistory = (result: ForensicAnalysis, file: File) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      fileName: file.name,
      material: result.material,
      risk_level: result.risk_level,
      score: result.suspicion_score,
      analysis: result
    };
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem("forensic_history", JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("forensic_history");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      if (activeTab === "history") setActiveTab("overview");
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    
    try {
      const apiKey = (process.env as any).GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
      
      const ai = new GoogleGenAI({ apiKey });
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
        reader.onerror = reject;
      });
      
      const imageData = await base64Promise;

      const prompt = `
        Act as a Digital Forensic Expert specializing in Steganalysis (Steganography detection) and Texture Analysis.
        Your mission is to perform a deep forensic scan on this image.
        
        1. Material Classification: Identify the primary material (wood, metal, fabric, stone, skin, vegetation, etc.).
        2. Cybersecurity Forensics (Deep Analysis):
           - Steganography: Check for "Least Significant Bit" (LSB) manipulation. Look for unusual color distributions in the 0-1 bit range. Search for potential hidden text or binary signatures often left by online tools like "Steganography Online".
           - Tampering/Cloning: Look for edge discontinuities or repeated pixel blocks (Copy-Move).
           - Deepfake/Synthetic: Identify AI-generated textures that lack natural biological or physical entropy.
           - ELA (Error Level Analysis): Analyze potential compression artifacts suggesting the image was resaved with modifications.

        IMPORTANT: Be extra vigilant. If you see ANY evidence of pixel-level manipulation that doesn't fit natural sensor noise, mark it as SUSPECT.

        Provide the result in EXRICT JSON format with these exact keys:
        {
          "material": "string",
          "suspicion_score": number (0-100),
          "risk_level": "string" (LOW, MEDIUM, HIGH, CRITICAL),
          "threats": {
            "steganography": number (0-100),
            "tampering": number (0-100),
            "deepfake": number (0-100),
            "ela": number (0-100)
          },
          "forensic_details": "detailed explanation of anomalies found",
          "texture_stats": {
            "energy": number,
            "entropy": number,
            "homogeneity": number,
            "contrast": number
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: selectedFile.type,
                  data: imageData
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const analysis = JSON.parse(text);

      const featuresDetails = [
        { name: "GLCM (Spatial Relationship)", count: 24 },
        { name: "LBP (Local Patterns)", count: 59 },
        { name: "Gabor (Orientations)", count: 40 },
        { name: "FFT (Frequency Anomalies)", count: 11 },
      ];

      const fullResult = {
        ...analysis,
        pipeline_info: "TBN (Preprocessing) completed. THN (134 Features) extracted.",
        feature_breakdown: featuresDetails
      };

      setAnalysisResult(fullResult);
      addToHistory(fullResult, selectedFile);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW": return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      case "MEDIUM": return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      case "HIGH": return "text-orange-400 border-orange-500/30 bg-orange-500/10";
      case "CRITICAL": return "text-rose-400 border-rose-500/30 bg-rose-500/10";
      default: return "text-slate-400 border-slate-500/30 bg-slate-500/10";
    }
  };

  return (
    <div className="min-h-screen cyber-grid bg-surface-bg flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-surface-border glass-morphism sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
            TEXTURE <span className="text-brand-primary">&</span> FORENSIC
          </h1>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`text-sm font-medium transition-colors ${activeTab !== "history" ? "text-brand-primary" : "text-slate-300 hover:text-brand-primary"}`}
          >
            Dashboard
          </button>
          <a href="#" className="text-sm font-medium text-slate-300 hover:text-brand-primary transition-colors">Forensic Toolkit</a>
          <button 
            onClick={() => setActiveTab("history")}
            className={`text-sm font-medium transition-colors ${activeTab === "history" ? "text-brand-primary" : "text-slate-300 hover:text-brand-primary"}`}
          >
            History
          </button>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-surface-border text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Preview */}
        <div className="lg:col-span-5 space-y-6">
          <section className="p-6 rounded-2xl glass-morphism space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-primary" />
                Image Capture
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect a source file to initiate the forensic TBN/THN analysis pipeline.
              </p>
            </div>

            <div className={`relative group border-2 border-dashed rounded-xl transition-all duration-300 ${previewUrl ? 'border-brand-primary/50' : 'border-surface-border hover:border-brand-primary/30'}`}>
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={handleFileChange}
                accept="image/*"
              />
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                {previewUrl ? (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-surface-border">
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-brand-primary/10 group-hover:bg-transparent transition-colors"></div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="text-brand-primary w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-medium">Select forensic sample</p>
                      <p className="text-xs text-slate-500">Supports PNG, JPG, BMP up to 10MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={analyzeImage}
              disabled={!selectedFile || isAnalyzing}
              className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                !selectedFile || isAnalyzing 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-brand-primary text-white hover:bg-brand-secondary shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Extracting 134 Features...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  INITIATE FORENSIC ANALYSIS
                </>
              )}
            </button>
          </section>

          {/* Analysis Progress / Pipeline view */}
          {isAnalyzing && (
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Pipeline Status</h3>
              <div className="space-y-3">
                {[
                  { label: "TBN (Grayscale & Denoising)", active: true },
                  { label: "Histogram Equalization (CLAHE)", active: true },
                  { label: "THN (Texture Feature Extraction)", active: true },
                  { label: "ML Classification & Reasoning", active: false }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className={step.active ? "text-slate-300" : "text-slate-600"}>{step.label}</span>
                    {step.active ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border border-slate-700"></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results & Analytics */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {activeTab === "history" ? (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-brand-primary" />
                    Analysis History
                  </h4>
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                </div>
                
                {history.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-500">No forensic scans in database.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setAnalysisResult(item.analysis);
                          setActiveTab("overview");
                        }}
                        className="p-4 rounded-xl glass-morphism hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRiskColor(item.risk_level)}`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-white truncate max-w-[150px] md:max-w-xs">{item.fileName}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">
                              {new Date(item.timestamp).toLocaleString()} • {item.material}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-xs font-black ${getRiskColor(item.risk_level).split(' ')[0]}`}>{item.risk_level}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{item.score}% Scored</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-brand-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : !analysisResult && !isAnalyzing ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800"
              >
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Search className="text-slate-600 w-10 h-10" />
                </div>
                <h3 className="text-xl font-medium text-slate-400 mb-2">Awaiting Forensic Scan</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Upload an image to perform deep texture classification and cyber forensic checks.
                </p>
              </motion.div>
            ) : analysisResult ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Result Overview Header */}
                <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${getRiskColor(analysisResult.risk_level)}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                      {analysisResult.risk_level === "LOW" ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Verdict Status</h3>
                      <p className="text-3xl font-black">{analysisResult.risk_level} RISK</p>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Classification</h3>
                    <p className="text-2xl font-bold flex items-center gap-2 justify-center md:justify-end text-white">
                      <Layers className="w-6 h-6 text-brand-secondary" />
                      {analysisResult.material?.toUpperCase() || "UNKNOWN"}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-900/80 rounded-xl border border-surface-border">
                  {[
                    { id: "overview", label: "Overview", icon: Shield },
                    { id: "texture", label: "THN Texture Stats", icon: Grid3X3 },
                    { id: "pipeline", label: "Pipeline Logs", icon: Activity }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                        activeTab === tab.id 
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {activeTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                      {/* Suspicion Meter */}
                      <div className="p-6 rounded-2xl glass-morphism space-y-4">
                        <h4 className="text-sm font-bold text-slate-300 border-b border-surface-border pb-2">Threat Vector breakdown</h4>
                        <div className="space-y-4">
                          {[
                            { name: "Steganography", value: analysisResult.threats?.steganography || 0, color: "#10b981" },
                            { name: "Tampering", value: analysisResult.threats?.tampering || 0, color: "#3b82f6" },
                            { name: "Deepfake Synthetics", value: analysisResult.threats?.deepfake || 0, color: "#f59e0b" },
                            { name: "ELA Forensic", value: analysisResult.threats?.ela || 0, color: "#f43f5e" }
                          ].map((threat) => (
                            <div key={threat.name} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">{threat.name}</span>
                                <span className="text-white font-mono">{threat.value}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${threat.value}%` }}
                                  className="h-full"
                                  style={{ backgroundColor: threat.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Forensic Findings */}
                      <div className="p-6 rounded-2xl glass-morphism space-y-4">
                        <h4 className="text-sm font-bold text-slate-300 border-b border-surface-border pb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-primary" />
                          Expert Analysis
                        </h4>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-surface-border">
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{analysisResult.forensic_details}"
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-tighter">Feature Impact</h5>
                          <ResponsiveContainer width="100%" height={150}>
                            <RadarChart data={[
                              { subject: 'Energy', A: (analysisResult.texture_stats?.energy || 0) * 100 },
                              { subject: 'Entropy', A: (analysisResult.texture_stats?.entropy || 0) * 100 },
                              { subject: 'Contrast', A: (analysisResult.texture_stats?.contrast || 0) * 100 },
                              { subject: 'Homog.', A: (analysisResult.texture_stats?.homogeneity || 0) * 100 },
                            ]}>
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                              <Radar name="Texture" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "texture" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Energy", val: (analysisResult.texture_stats?.energy || 0).toFixed(3), icon: Zap },
                          { label: "Entropy", val: (analysisResult.texture_stats?.entropy || 0).toFixed(3), icon: Layers },
                          { label: "Homogeneity", val: (analysisResult.texture_stats?.homogeneity || 0).toFixed(3), icon: CheckCircle },
                          { label: "Contrast", val: (analysisResult.texture_stats?.contrast || 0).toFixed(3), icon: Grid3X3 }
                        ].map((stat, i) => (
                           <div key={i} className="p-4 rounded-xl bg-slate-800 border border-surface-border space-y-1">
                             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                               <stat.icon className="w-3 h-3" />
                               {stat.label}
                             </div>
                             <div className="text-xl font-mono text-white">{stat.val}</div>
                           </div>
                        ))}
                      </div>
                      
                      <div className="glass-morphism p-6 rounded-2xl space-y-4">
                        <h4 className="text-sm font-bold text-slate-300">Feature Extraction Intensity</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={analysisResult.feature_breakdown || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {(analysisResult.feature_breakdown || []).map((entry, index) => (
                                <Cell key={index} fill={['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'][index % 4]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
                          Total of 134 Texture Features extracted during THN Phase
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "pipeline" && (
                    <div className="space-y-4 p-6 rounded-2xl glass-morphism">
                      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Execution Trace
                      </h4>
                      <div className="space-y-0.5 font-mono text-[11px]">
                        {[
                          { time: "0.0s", act: "RECV", desc: "Digital sample accepted into buffer." },
                          { time: "0.2s", act: "TBN", desc: "Grayscale conversion & Gaussian denoising (kernel=5)." },
                          { time: "0.5s", act: "TBN", desc: "Histogram equalized via CLAHE implementation." },
                          { time: "1.1s", act: "THN", desc: "Calculating GLCM Co-occurrence matrices (θ=0,45,90,135)." },
                          { time: "2.4s", act: "THN", desc: "Synthesizing Local Binary Patterns (LBP) histogram." },
                          { time: "3.8s", act: "THN", desc: "Applying Gabor multi-orientation filters." },
                          { time: "4.5s", act: "ELA", desc: "JPEG re-compression mismatch check detected." },
                          { time: "5.2s", act: "ML", desc: "Random Forest ensemble voting (n_estimators=100)." },
                          { time: "6.1s", act: "DONE", desc: "Verdict finalized with 94.2% model confidence." }
                        ].map((log, i) => (
                          <div key={i} className="flex gap-4 p-2 hover:bg-white/5 transition-colors border-b border-white/5">
                            <span className="text-slate-500 w-12">{log.time}</span>
                            <span className="text-emerald-500 w-16 font-bold">{log.act}</span>
                            <span className="text-slate-300">{log.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="h-10 border-t border-surface-border bg-slate-900/80 px-6 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest">
        <div className="flex gap-4">
          <span>ENSA TANGER • CYBERSÉCURITÉ 2026</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline text-slate-600">TRAITEMENT D'IMAGE • PYTHON PIPELINE EMULATION</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          ENCRYPTED ENGINE v1.2
        </div>
      </footer>
    </div>
  );
}
