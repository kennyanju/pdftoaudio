import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Play, Download, Clock, Loader2, Music } from 'lucide-react';
import { uploadPdf, startConversion, getJobStatus, getHistory, getDownloadUrl, Job } from './api';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [history, setHistory] = useState<Job[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentJobId && status !== 'Completed' && !status.startsWith('Failed')) {
      interval = setInterval(async () => {
        try {
          const job = await getJobStatus(currentJobId);
          setStatus(job.status);
          if (job.status === 'Completed' || job.status.startsWith('Failed')) {
            clearInterval(interval);
            fetchHistory();
          }
        } catch (error) {
          console.error("Error fetching status:", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [currentJobId, status]);

  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setIsUploading(true);
      try {
        const response = await uploadPdf(selectedFile);
        setPreviewText(response.text_preview);
        setCurrentJobId(response.job_id);
        setStatus("Ready to Convert");
      } catch (error) {
        console.error("Upload error:", error);
        setStatus("Upload Failed");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleConvert = async () => {
    if (currentJobId) {
      try {
        setStatus("Starting Conversion...");
        await startConversion(currentJobId);
      } catch (error) {
        console.error("Conversion start error:", error);
        setStatus("Failed to start conversion");
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 flex flex-col gap-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-sm mb-4">
            <Music className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-purple-300">
            PDF to Audio
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-light">
            Transform your documents into high-quality immersive audio experiences using OpenRouter.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Action Area */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-xl">
              
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700/50 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <UploadCloud className="w-16 h-16 text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300 mb-6" />
                  <h3 className="text-2xl font-semibold mb-2">Upload your PDF</h3>
                  <p className="text-slate-400 text-center">Drag and drop your file here, or click to browse</p>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/20 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200">{file.name}</h4>
                        <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setFile(null); setPreviewText(''); setStatus(''); }}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Text Preview
                    </h4>
                    <div className="p-4 bg-slate-900/80 rounded-xl border border-white/5 text-sm text-slate-400 h-48 overflow-y-auto leading-relaxed custom-scrollbar shadow-inner">
                      {isUploading ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                        </div>
                      ) : previewText}
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {status.includes('Processing') || isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                      ) : status === 'Completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                      <span className="text-slate-300 font-medium">
                        {status || 'Waiting for confirmation...'}
                      </span>
                    </div>

                    {(status === 'Ready to Convert' || status === 'Failed') && (
                      <button
                        onClick={handleConvert}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                      >
                        <Play className="w-4 h-4" /> Convert to Audio
                      </button>
                    )}
                  </div>
                  
                  {status === 'Completed' && currentJobId && (
                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <audio controls className="w-full h-12" src={getDownloadUrl(currentJobId)}>
                        Your browser does not support the audio element.
                      </audio>
                      <a 
                        href={getDownloadUrl(currentJobId)}
                        download
                        className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download MP3
                      </a>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Sidebar / History */}
          <div className="lg:col-span-5">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl h-[600px] flex flex-col">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-200">
                <Clock className="w-5 h-5 text-purple-400" /> Recent Conversions
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                    <Music className="w-12 h-12 opacity-20" />
                    <p>No conversions yet.</p>
                  </div>
                ) : (
                  history.map((job) => (
                    <div key={job.id} className="p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="font-medium text-slate-200 truncate pr-4" title={job.filename}>
                          {job.filename}
                        </h5>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          job.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          job.status.includes('Failed') ? 'bg-red-500/20 text-red-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {job.status === 'Completed' ? 'Done' : job.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-3">
                        {new Date(job.created_at).toLocaleString()} • {job.num_chunks} chunks
                      </div>
                      
                      {job.status === 'Completed' && (
                        <div className="flex items-center gap-3">
                           <audio controls className="h-8 flex-1 max-w-[200px]" src={getDownloadUrl(job.id)} />
                           <a 
                             href={getDownloadUrl(job.id)} 
                             className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                             title="Download"
                             download
                           >
                              <Download className="w-4 h-4" />
                           </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Global minimal scrollbar override for aesthetic layout */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}

export default App;
