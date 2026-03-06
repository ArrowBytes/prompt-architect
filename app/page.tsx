"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, History, MessageSquare, Zap, Lightbulb, X, Terminal, LogOut, Globe, Users, Lock, Type, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// --- DYNAMIC TIPS ARRAYS ---
const TIPS = {
  text: [
    "Assign a role: Tell the AI to 'Act as a senior software engineer'.",
    "Be specific about format: Request 'Markdown tables' or 'JSON'.",
    "Provide constraints: Tell it what NOT to do."
  ],
  image: [
    "Specify the medium: Is it a '3D render', 'oil painting', or 'polaroid'?",
    "Lighting is everything: Use terms like 'cinematic lighting' or 'golden hour'.",
    "Detail the camera: Mention 'wide angle', 'macro shot', or '85mm lens'."
  ],
  video: [
    "Define camera motion: 'Slow pan left', 'drone flythrough', or 'tracking shot'.",
    "Focus on continuous action: Video AI needs to know exactly what is moving.",
    "Set the vibe: Mention 'grainy film stock' or 'cinematic 24fps'."
  ]
};

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [view, setView] = useState<'build' | 'community'>('build');
  const [mode, setMode] = useState<'text' | 'image' | 'video'>('text');
  
  // Dynamic Questions State
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");

  const [currentPromptId, setCurrentPromptId] = useState<number | null>(null);
  const [isCurrentPublic, setIsCurrentPublic] = useState(false);
  const [communityPrompts, setCommunityPrompts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // Tip Cycler
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS[mode].length);
    }, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (session) {
      fetchHistory();
      fetchCommunityPrompts();
    }
  }, [session]);

  // Reset questions when mode changes
  useEffect(() => {
    setQ1("");
    setQ2("");
    setCurrentTip(0);
  }, [mode]);

  const fetchHistory = async () => {
    if (!session) return;
    const { data } = await supabase.from('prompts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20);
    if (data) setHistory(data);
  };

  const fetchCommunityPrompts = async () => {
    const { data } = await supabase.from('prompts').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(30);
    if (data) setCommunityPrompts(data);
  };

  const handleGenerate = async () => {
    if (!input || !session) return;
    setIsLoading(true);
    setIsCurrentPublic(false);
    
    // Package the specific questions to send to the AI
    let extraContext = "";
    if (mode === 'image') extraContext = `Style/Medium: ${q1}. Lighting/Mood: ${q2}.`;
    if (mode === 'video') extraContext = `Camera Movement: ${q1}. Pacing/Vibe: ${q2}.`;
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, mode, extraContext }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOutput(data.result);
        const { data: newRow } = await supabase
          .from('prompts')
          .insert([{ 
            original_idea: input, 
            refined_prompt: data.result,
            user_id: session.user.id,
            is_public: false,
            prompt_type: mode // NEW: Save the mode to the DB!
          }])
          .select().single();
          
        if (newRow) {
          setCurrentPromptId(newRow.id);
          fetchHistory();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePublish = async () => {
    if (!currentPromptId) return;
    const newStatus = !isCurrentPublic;
    setIsCurrentPublic(newStatus);
    await supabase.from('prompts').update({ is_public: newStatus }).eq('id', currentPromptId);
    fetchHistory();
    fetchCommunityPrompts();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!session) {
    // ... (Keep existing login UI exactly the same)
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[150px] rounded-full"></div>
        <div className="w-full max-w-md backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-8 relative z-10">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">PromptArchitect</h1>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: { default: { colors: { brand: '#4f46e5', brandAccent: '#4338ca', inputText: 'white', inputBackground: '#18181b', inputBorder: '#27272a', inputBorderFocus: '#22d3ee' } } }
            }}
            theme="dark"
            providers={[]} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[150px] rounded-full"></div>

      <nav className="relative z-40 w-full backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 hidden sm:block">PromptArchitect</span>
          </div>
          <div className="hidden md:flex bg-black/40 border border-white/10 rounded-lg p-1">
            <button onClick={() => setView('build')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'build' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Build</button>
            <button onClick={() => { setView('community'); fetchCommunityPrompts(); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'community' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Users className="w-4 h-4" /> Community</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium"><History className="w-4 h-4" /><span className="hidden sm:block">History</span></button>
          <button onClick={() => supabase.auth.signOut()} className="p-2 text-zinc-400 hover:text-red-400 rounded-lg"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      {/* History Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 backdrop-blur-xl bg-black/80 border-l border-white/10 p-6 transform transition-transform duration-500 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-300"><History className="w-5 h-5" /> Archive</h2>
          <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto h-[calc(100vh-120px)] pb-10">
          {history.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => { setInput(item.original_idea); setOutput(item.refined_prompt); setMode(item.prompt_type || 'text'); setView('build'); setIsHistoryOpen(false); }}>
                {item.prompt_type === 'image' ? <ImageIcon className="w-4 h-4 text-pink-400 mt-1" /> : item.prompt_type === 'video' ? <Video className="w-4 h-4 text-purple-400 mt-1" /> : <MessageSquare className="w-4 h-4 text-cyan-400 mt-1" />}
                <p className="text-sm font-medium text-zinc-200 truncate">{item.original_idea}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {view === 'build' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
              
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
                
                {/* NEW: Mode Selector */}
                <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl mb-6 w-fit">
                  <button onClick={() => setMode('text')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'text' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}><Type className="w-4 h-4" /> Text Mode</button>
                  <button onClick={() => setMode('image')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'image' ? 'bg-pink-500/20 text-pink-300' : 'text-zinc-500 hover:text-zinc-300'}`}><ImageIcon className="w-4 h-4" /> Image Mode</button>
                  <button onClick={() => setMode('video')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'video' ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'}`}><Video className="w-4 h-4" /> Video Mode</button>
                </div>

                <h1 className="text-3xl font-bold mb-2 text-white">Craft the Perfect Prompt.</h1>
                <p className="text-zinc-400 mb-6 text-sm">Dump your messy thoughts below. We will optimize it for {mode === 'text' ? 'ChatGPT/Claude' : mode === 'image' ? 'Midjourney/DALL-E' : 'Sora/Runway'}.</p>
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`What do you want to ${mode === 'text' ? 'write or build' : mode === 'image' ? 'see' : 'direct'}?`}
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none mb-4"
                />

                {/* NEW: Dynamic Questions */}
                {mode === 'image' && (
                  <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-4">
                    <div>
                      <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 block">Art Style / Medium</label>
                      <input type="text" value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="e.g., 3D Render, Oil Painting, Cyberpunk" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 block">Lighting / Mood</label>
                      <input type="text" value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="e.g., Cinematic lighting, Golden hour, Neon" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50" />
                    </div>
                  </div>
                )}

                {mode === 'video' && (
                  <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-4">
                    <div>
                      <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 block">Camera Movement</label>
                      <input type="text" value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="e.g., Drone flyover, Slow pan left" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 block">Pacing / Vibe</label>
                      <input type="text" value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="e.g., Fast-paced, Cinematic 24fps, Moody" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50" />
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <button onClick={handleGenerate} disabled={isLoading || !input} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all text-white ${mode === 'text' ? 'bg-gradient-to-r from-indigo-600 to-cyan-600' : mode === 'image' ? 'bg-gradient-to-r from-pink-600 to-rose-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
                    {isLoading ? "Synthesizing..." : <>Generate Magic <Zap className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>

              {/* --- NEW: EDUCATIONAL & FAQ SECTION --- */}
          <div className="mt-32 mb-12 animate-in fade-in duration-700">
            
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-4">
                Why Prompt Engineering Matters.
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                Generative AI models are powerful, but they operate exactly like highly literal interns. If you give them vague instructions, you get generic, hallucinated, or unhelpful results. 
              </p>
            </div>

            {/* 3-Pillar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
              <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4 border border-cyan-500/20">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Absolute Precision</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Stop hoping the AI guesses what you want. By explicitly defining the Persona and Format, you force the model to output exactly what you need on the very first try.</p>
              </div>

              <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4 border border-indigo-500/20">
                  <Lock className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Constraint Enforcement</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">The best way to control AI is by telling it what *not* to do. Setting hard constraints prevents AI from using corporate jargon or rambling off-topic.</p>
              </div>

              <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-colors">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 border border-purple-500/20">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Workflow Velocity</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Instead of spending 20 minutes going back-and-forth arguing with ChatGPT, a perfectly architected prompt gets you production-ready code or copy instantly.</p>
              </div>
            </div>

            {/* FAQ Accordion Style Box */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full blur-3xl pointer-events-none"></div>
              
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-indigo-400" /> Frequently Asked Questions
              </h3>
              
              <div className="space-y-6 relative z-10">
                <div className="border-b border-white/10 pb-6">
                  <h4 className="text-zinc-100 font-semibold mb-2">How does Prompt Architect actually work?</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">We use a "meta-prompting" technique. When you type your messy idea, we send it to an AI model that has been specifically trained on Google's prompt engineering frameworks. It analyzes your intent and completely rewrites your idea into a highly structured format before you ever paste it into ChatGPT, Midjourney, or Sora.</p>
                </div>
                
                <div className="border-b border-white/10 pb-6">
                  <h4 className="text-zinc-100 font-semibold mb-2">Why do I need to choose Text, Image, or Video?</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">Different AI models require entirely different instruction structures. LLMs (Text) need logic, context, and rules. Diffusion models (Image) need comma-separated keywords detailing lighting and camera lenses. Video generation models need continuous motion vectors and scene pacing. We switch our backend engine based on your selection.</p>
                </div>

                <div className="pt-2">
                  <h4 className="text-zinc-100 font-semibold mb-2">Can I see prompts made by other people?</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">Yes! If a user chooses to publish their prompt, it is sent to our global database. You can click the "Community" tab at the top of the page to browse, discover, and copy high-quality prompts engineered by other users.</p>
                </div>
              </div>
            </div>
          </div>
          {/* --- END EDUCATIONAL SECTION --- */}

              {output && (
                <div className={`animate-in fade-in slide-in-from-bottom-8 duration-700 backdrop-blur-md bg-white/5 border border-white/10 border-l-4 rounded-3xl p-6 sm:p-8 ${mode === 'text' ? 'border-l-cyan-400' : mode === 'image' ? 'border-l-pink-400' : 'border-l-purple-400'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <label className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider ${mode === 'text' ? 'text-cyan-400' : mode === 'image' ? 'text-pink-400' : 'text-purple-400'}`}>
                      <Sparkles className="w-4 h-4" /> Optimized Output
                    </label>
                    <div className="flex items-center gap-3">
                      {currentPromptId && (
                        <button onClick={togglePublish} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isCurrentPublic ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}>
                          <Globe className="w-3 h-3" /> {isCurrentPublic ? 'Live in Community' : 'Publish'}
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
              <div className="backdrop-blur-md bg-gradient-to-br from-white/5 to-black border border-white/10 rounded-3xl p-6 h-full min-h-[300px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-lg ${mode === 'text' ? 'bg-cyan-500/20' : mode === 'image' ? 'bg-pink-500/20' : 'bg-purple-500/20'}`}><Lightbulb className={`w-5 h-5 ${mode === 'text' ? 'text-cyan-400' : mode === 'image' ? 'text-pink-400' : 'text-purple-400'}`} /></div>
                  <h3 className="font-semibold text-zinc-100">Pro Prompting Tips</h3>
                </div>
                <div className="relative h-32">
                  {TIPS[mode].map((tip, index) => (
                    <p key={index} className={`absolute top-0 left-0 text-zinc-300 leading-relaxed transition-all duration-1000 ${index === currentTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                      "{tip}"
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* Community view kept simple for brevity */}
             <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Users className="w-8 h-8 text-indigo-400" /> Community Prompts
                </h1>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {communityPrompts.map((prompt) => (
                  <div key={prompt.id} className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                         {prompt.prompt_type === 'image' ? <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 px-2 py-1 rounded-md">Image</span> : prompt.prompt_type === 'video' ? <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md">Video</span> : <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-md">Text</span>}
                      </div>
                      <h3 className="font-medium text-white mb-2 line-clamp-2">"{prompt.original_idea}"</h3>
                      <p className="text-xs text-zinc-500 line-clamp-4 font-mono mb-4 bg-black/40 p-3 rounded-xl">{prompt.refined_prompt}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
      
      {isHistoryOpen && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsHistoryOpen(false)}></div>}
    </div>
  );
}