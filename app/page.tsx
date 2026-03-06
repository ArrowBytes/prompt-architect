"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, History, MessageSquare, Zap, Lightbulb, X, Terminal, LogOut, Globe, Users, Lock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const PROMPT_TIPS = [
  "Assign a role: Tell the AI to 'Act as a senior software engineer' for better technical depth.",
  "Be specific about format: Request 'Markdown tables', 'Bullet points', or 'JSON format'.",
  "Provide constraints: Tell it what NOT to do (e.g., 'Do not use corporate jargon').",
  "Give context: Explain WHY you need this so the AI understands your underlying goal."
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // --- NEW STATES FOR COMMUNITY ---
  const [view, setView] = useState<'build' | 'community'>('build');
  const [currentPromptId, setCurrentPromptId] = useState<number | null>(null);
  const [isCurrentPublic, setIsCurrentPublic] = useState(false);
  const [communityPrompts, setCommunityPrompts] = useState<any[]>([]);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % PROMPT_TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchHistory();
      fetchCommunityPrompts();
    }
  }, [session]);

  const fetchHistory = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  // --- NEW: Fetch Community Prompts ---
  const fetchCommunityPrompts = async () => {
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setCommunityPrompts(data);
  };

  const handleGenerate = async () => {
    if (!input || !session) return;
    setIsLoading(true);
    setIsCurrentPublic(false);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOutput(data.result);
        
        // Save and immediately get the ID back so we can publish it
        const { data: newRow, error } = await supabase
          .from('prompts')
          .insert([{ 
            original_idea: input, 
            refined_prompt: data.result,
            user_id: session.user.id,
            is_public: false
          }])
          .select()
          .single();
          
        if (newRow) {
          setCurrentPromptId(newRow.id);
          fetchHistory();
        }
      } else {
        setOutput("Error generating prompt. Check your API key.");
      }
    } catch (error) {
      setOutput("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Toggle Public Status ---
  const togglePublish = async () => {
    if (!currentPromptId) return;
    const newStatus = !isCurrentPublic;
    setIsCurrentPublic(newStatus);
    
    await supabase
      .from('prompts')
      .update({ is_public: newStatus })
      .eq('id', currentPromptId);
      
    fetchHistory();
    fetchCommunityPrompts();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
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
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#4f46e5',
                    brandAccent: '#4338ca',
                    inputText: 'white',
                    inputBackground: '#18181b',
                    inputBorder: '#27272a',
                    inputBorderFocus: '#22d3ee',
                  }
                }
              }
            }}
            theme="dark"
            providers={[]} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-cyan-500/30">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none"></div>

      <nav className="relative z-40 w-full backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 hidden sm:block">
              PromptArchitect
            </span>
          </div>
          
          {/* NEW: View Toggles */}
          <div className="hidden md:flex bg-black/40 border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setView('build')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'build' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Build Prompts
            </button>
            <button 
              onClick={() => { setView('community'); fetchCommunityPrompts(); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'community' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Users className="w-4 h-4" /> Community
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm font-medium"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:block">My History</span>
          </button>
          <button onClick={() => supabase.auth.signOut()} className="p-2 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* History Drawer */}
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
          {history.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => { setInput(item.original_idea); setOutput(item.refined_prompt); setView('build'); setIsHistoryOpen(false); }}>
                <MessageSquare className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <p className="text-sm font-medium text-zinc-200 truncate">{item.original_idea}</p>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  {item.is_public ? <><Globe className="w-3 h-3 text-green-400"/> Public</> : <><Lock className="w-3 h-3"/> Private</>}
                </span>
                <button onClick={() => copyToClipboard(item.refined_prompt)} className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors">Copy</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {view === 'build' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <h1 className="text-3xl font-bold mb-2 text-white">Craft the Perfect Prompt.</h1>
                <p className="text-zinc-400 mb-6 text-sm">Dump your messy thoughts below. The AI will structure it for maximum output quality.</p>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., I want to build a habit tracker..."
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
                <div className="flex justify-end mt-4">
                  <button onClick={handleGenerate} disabled={isLoading || !input} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-8 py-3.5 rounded-xl font-semibold transition-all">
                    {isLoading ? "Synthesizing..." : <>Generate Magic <Zap className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>

              {output && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 backdrop-blur-md bg-white/5 border border-white/10 border-l-4 border-l-cyan-400 rounded-3xl p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <label className="text-sm font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" /> Optimized Output
                    </label>
                    <div className="flex items-center gap-3">
                      {/* NEW: Publish Toggle */}
                      {currentPromptId && (
                        <button onClick={togglePublish} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isCurrentPublic ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}>
                          <Globe className="w-3 h-3" /> {isCurrentPublic ? 'Live in Community' : 'Publish to Community'}
                        </button>
                      )}
                      <button onClick={() => copyToClipboard(output)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 text-xs font-medium">
                        {copied ? "Copied!" : "Copy Prompt"}
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-6 leading-relaxed text-zinc-200 whitespace-pre-wrap font-mono text-sm border border-white/5 overflow-x-auto">
                    {output}
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-1 hidden lg:block">
              <div className="backdrop-blur-md bg-gradient-to-br from-indigo-900/20 to-black border border-indigo-500/20 rounded-3xl p-6 h-full min-h-[300px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/20 rounded-lg"><Lightbulb className="w-5 h-5 text-indigo-400" /></div>
                  <h3 className="font-semibold text-zinc-100">Pro Prompting Tips</h3>
                </div>
                <div className="relative h-32">
                  {PROMPT_TIPS.map((tip, index) => (
                    <p key={index} className={`absolute top-0 left-0 text-zinc-300 leading-relaxed transition-all duration-1000 ${index === currentTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                      "{tip}"
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* NEW: Community Feed View */
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Users className="w-8 h-8 text-indigo-400" /> Community Prompts
                </h1>
                <p className="text-zinc-400 mt-2">Discover high-quality prompts generated by other architects.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityPrompts.length === 0 ? (
                <p className="text-zinc-500 col-span-3 text-center py-12 border border-dashed border-white/10 rounded-2xl">No public prompts yet. Be the first to share one!</p>
              ) : (
                communityPrompts.map((prompt) => (
                  <div key={prompt.id} className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-500/50 transition-all flex flex-col justify-between group">
                    <div>
                      <h3 className="font-medium text-white mb-2 line-clamp-2">"{prompt.original_idea}"</h3>
                      <p className="text-xs text-zinc-500 line-clamp-4 font-mono mb-4 bg-black/40 p-3 rounded-xl border border-white/5">{prompt.refined_prompt}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(prompt.refined_prompt)}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-zinc-300 transition-colors flex justify-center items-center gap-2 group-hover:border-indigo-500/30"
                    >
                      <Copy className="w-4 h-4" /> Copy Prompt
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
      
      {isHistoryOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden" onClick={() => setIsHistoryOpen(false)}></div>}
    </div>
  );
}