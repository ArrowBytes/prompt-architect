"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, ArrowRight, History, MessageSquare, Zap, Lightbulb, X, Terminal, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const PROMPT_TIPS = [
  "Assign a role: Tell the AI to 'Act as a senior software engineer' for better technical depth.",
  "Be specific about format: Request 'Markdown tables', 'Bullet points', or 'JSON format'.",
  "Provide constraints: Tell it what NOT to do (e.g., 'Do not use corporate jargon').",
  "Give context: Explain WHY you need this so the AI understands your underlying goal.",
  "Use examples: Giving the AI a 1-2 sentence example drastically improves the output."
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  // --- NEW: Handle Authentication ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cycle through tips
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % PROMPT_TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [session]);

  // Fetch history only for the logged-in user
  useEffect(() => {
    if (session) fetchHistory();
  }, [session]);

  const fetchHistory = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', session.user.id) // NEW: Only fetch this user's prompts
      .order('created_at', { ascending: false })
      .limit(15);
    if (data) setHistory(data);
  };

  const handleGenerate = async () => {
    if (!input || !session) return;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOutput(data.result);
        const { error } = await supabase
          .from('prompts')
          .insert([{ 
            original_idea: input, 
            refined_prompt: data.result,
            user_id: session.user.id // NEW: Save the prompt to this specific user
          }]);
          
        if (!error) fetchHistory();
      } else {
        setOutput("Error generating prompt. Check your API key.");
      }
    } catch (error) {
      setOutput("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- NEW: The Login Screen ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none"></div>
        
        <div className="w-full max-w-md backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
              PromptArchitect
            </h1>
            <p className="text-zinc-400 text-sm text-center">Sign in to start building and saving your perfect AI prompts.</p>
          </div>
          
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={['google', 'github']}
          />
        </div>
      </div>
    );
  }

  // --- The Main App (Only shows if logged in) ---
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* Ambient Neon Background Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Top Navigation Bar */}
      <nav className="relative z-40 w-full backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 hidden sm:block">
            PromptArchitect
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-lg transition-all text-sm font-medium shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:block">History</span>
          </button>

          {/* NEW: Sign Out Button */}
          <button 
            onClick={() => supabase.auth.signOut()}
            className="p-2 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Slide-out History Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 backdrop-blur-xl bg-black/80 border-l border-white/10 p-6 transform transition-transform duration-500 ease-in-out ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-300">
            <History className="w-5 h-5" /> Your Archive
          </h2>
          <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        <div className="flex flex-col gap-4 overflow-y-auto h-[calc(100vh-120px)] pb-10 custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center mt-10">No prompts generated yet.</p>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-indigo-500/50 hover:bg-white/10 transition-all cursor-pointer group"
                onClick={() => { 
                  setInput(item.original_idea); 
                  setOutput(item.refined_prompt); 
                  setIsHistoryOpen(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                  <div className="flex flex-col gap-2 overflow-hidden">
                    <p className="text-sm font-medium text-zinc-200 truncate">{item.original_idea}</p>
                    <p className="text-xs text-zinc-500 line-clamp-2">{item.refined_prompt}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Generator */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
          
          {/* Glassy Input Card */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <h1 className="text-3xl font-bold mb-2 text-white relative z-10">Craft the Perfect Prompt.</h1>
            <p className="text-zinc-400 mb-6 text-sm relative z-10">Dump your messy thoughts below. The AI will structure it for maximum output quality.</p>

            <div className="relative z-10">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., I want to build a habit tracker in Flutter but I don't know where to start..."
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all shadow-inner"
              />
            </div>
            
            <div className="flex justify-end mt-4 relative z-10">
              <button
                onClick={handleGenerate}
                disabled={isLoading || !input}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="animate-pulse">Synthesizing...</span>
                ) : (
                  <>Generate Magic <Zap className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>

          {/* Glassy Output Card */}
          {output && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 backdrop-blur-md bg-white/5 border border-white/10 border-l-4 border-l-cyan-400 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Optimized Output
                </label>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors border border-white/10 text-xs font-medium"
                >
                  {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Prompt</>}
                </button>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-6 leading-relaxed text-zinc-200 whitespace-pre-wrap font-mono text-sm border border-white/5 shadow-inner">
                {output}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Tips */}
        <div className="col-span-1 hidden lg:block">
          <div className="backdrop-blur-md bg-gradient-to-br from-indigo-900/20 to-black border border-indigo-500/20 rounded-3xl p-6 h-full min-h-[300px] shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden group">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-2xl transition-all group-hover:bg-cyan-500/10"></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Lightbulb className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-zinc-100">Pro Prompting Tips</h3>
            </div>

            <div className="relative z-10 h-32">
              {PROMPT_TIPS.map((tip, index) => (
                <p 
                  key={index}
                  className={`absolute top-0 left-0 text-zinc-300 leading-relaxed transition-all duration-1000 ${
                    index === currentTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  "{tip}"
                </p>
              ))}
            </div>

            <div className="absolute bottom-6 left-6 flex gap-2 z-10">
              {PROMPT_TIPS.map((_, index) => (
                <div 
                  key={index} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index === currentTip ? 'w-6 bg-indigo-400' : 'w-2 bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Overlay to close drawer when clicking outside */}
      {isHistoryOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setIsHistoryOpen(false)}
        ></div>
      )}
    </div>
  );
}