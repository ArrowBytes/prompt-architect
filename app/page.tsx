"use client";

import { useState, useEffect } from "react";
import { Sparkles, Copy, History, MessageSquare, Zap, Lightbulb, X, Terminal, LogOut, Globe, Users, Lock, Type, Image as ImageIcon, Video, Volume2, VolumeX, Moon, Sun, Star, Activity, PieChart, Command, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

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
  
  const [displayedOutput, setDisplayedOutput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [view, setView] = useState<'build' | 'community'>('build');
  const [mode, setMode] = useState<'text' | 'image' | 'video'>('text');
  
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");

  const [currentPromptId, setCurrentPromptId] = useState<number | null>(null);
  const [isCurrentPublic, setIsCurrentPublic] = useState(false);
  const [communityPrompts, setCommunityPrompts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  const [stats, setStats] = useState({ total: 0, topMode: 'Text', publicShared: 0 });

  const [isDark, setIsDark] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const currentTheme = {
    text: {
      blob1: isDark ? 'bg-indigo-600/30' : 'bg-indigo-400/40',
      blob2: isDark ? 'bg-cyan-600/30' : 'bg-cyan-400/40',
      gradient: 'from-indigo-400 to-cyan-400',
      button: 'from-indigo-600 to-cyan-600',
      border: 'border-cyan-500',
      icon: 'text-cyan-500',
      iconBg: 'bg-cyan-500/20'
    },
    image: {
      blob1: isDark ? 'bg-pink-600/30' : 'bg-pink-400/40',
      blob2: isDark ? 'bg-rose-600/30' : 'bg-rose-400/40',
      gradient: 'from-pink-400 to-rose-400',
      button: 'from-pink-600 to-rose-600',
      border: 'border-pink-500',
      icon: 'text-pink-500',
      iconBg: 'bg-pink-500/20'
    },
    video: {
      blob1: isDark ? 'bg-purple-600/30' : 'bg-purple-400/40',
      blob2: isDark ? 'bg-fuchsia-600/30' : 'bg-fuchsia-400/40',
      gradient: 'from-purple-400 to-fuchsia-400',
      button: 'from-purple-600 to-fuchsia-600',
      border: 'border-purple-500',
      icon: 'text-purple-500',
      iconBg: 'bg-purple-500/20'
    }
  }[mode];

  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime); 
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // 🚨 THE FIX IS HERE 🚨
  // The timer now strictly stops if there is no session!
  useEffect(() => {
    if (!session) return; 
    const interval = setInterval(() => setCurrentTip((prev) => (prev + 1) % TIPS[mode].length), 5000);
    return () => clearInterval(interval);
  }, [mode, session]);

  useEffect(() => {
    if (session) { 
      fetchHistory(); 
      fetchCommunityPrompts(); 
      fetchUserStats();
    }
  }, [session]);

  useEffect(() => { setQ1(""); setQ2(""); setCurrentTip(0); }, [mode]);

  useEffect(() => {
    if (!output) {
      setDisplayedOutput("");
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    setDisplayedOutput("");
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < output.length) {
        setDisplayedOutput((prev) => prev + output.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 10);
    return () => clearInterval(typingInterval);
  }, [output]);

  const fetchUserStats = async () => {
    if (!session) return;
    const { data } = await supabase.from('prompts').select('prompt_type, is_public').eq('user_id', session.user.id);
    
    if (data && data.length > 0) {
      const total = data.length;
      const publicShared = data.filter((p) => p.is_public).length;
      
      const modeCounts = data.reduce((acc, curr) => {
        const type = curr.prompt_type || 'text';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topModeRaw = Object.keys(modeCounts).sort((a, b) => modeCounts[b] - modeCounts[a])[0];
      const topMode = topModeRaw.charAt(0).toUpperCase() + topModeRaw.slice(1);
      
      setStats({ total, topMode, publicShared });
    } else {
      setStats({ total: 0, topMode: 'Text', publicShared: 0 });
    }
  };

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
    playClickSound();
    if (!input || !session) return;
    
    setIsLoading(true);
    setIsCurrentPublic(false);
    setOutput(""); 
    
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
        const { data: newRow } = await supabase.from('prompts').insert([{ original_idea: input, refined_prompt: data.result, user_id: session.user.id, is_public: false, prompt_type: mode }]).select().single();
        if (newRow) { 
          setCurrentPromptId(newRow.id); 
          fetchHistory(); 
          fetchUserStats(); 
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const togglePublish = async () => {
    playClickSound();
    if (!currentPromptId) return;
    const newStatus = !isCurrentPublic;
    setIsCurrentPublic(newStatus);
    await supabase.from('prompts').update({ is_public: newStatus }).eq('id', currentPromptId);
    fetchHistory(); 
    fetchCommunityPrompts();
    fetchUserStats(); 
  };

  const handleDeletePrompt = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    await supabase.from('prompts').delete().eq('id', id);
    
    if (currentPromptId === id) {
      setCurrentPromptId(null);
      setOutput("");
      setDisplayedOutput("");
    }
    
    fetchHistory();
    fetchCommunityPrompts();
    fetchUserStats();
  };

  const copyToClipboard = (text: string) => {
    playClickSound();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeBg = isDark ? "bg-[#050505]" : "bg-slate-50";
  const themeTextMain = isDark ? "text-white" : "text-slate-900";
  const themeTextMuted = isDark ? "text-zinc-400" : "text-slate-500";
  const themeCardBg = isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-lg";
  const themeInputBg = isDark ? "bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600" : "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400";

  if (!session) {
    return (
      <div className={`min-h-screen ${themeBg} transition-colors duration-1000 flex items-center justify-center p-6 relative overflow-hidden`}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float-slow {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
          .animate-float-delayed { animation: float-slow 18s ease-in-out infinite; animation-delay: -5s; }
        `}} />
        
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${currentTheme.blob1} blur-[150px] rounded-full animate-float-slow transition-colors duration-1000`}></div>
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${currentTheme.blob2} blur-[150px] rounded-full animate-float-delayed transition-colors duration-1000`}></div>
        
        <div className={`w-full max-w-md backdrop-blur-xl ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/70 border-white/50 shadow-2xl'} border rounded-3xl p-10 relative z-10 transition-colors duration-500`}>
          <div className="flex flex-col items-center gap-4 mb-10">
            <Command className={`w-10 h-10 ${isDark ? 'text-white' : 'text-slate-900'}`} strokeWidth={1.5} />
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>ThePromptArchitect</h1>
          </div>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#4f46e5', brandAccent: '#4338ca', inputText: isDark ? 'white' : 'black', inputBackground: isDark ? '#18181b' : 'white', inputBorder: isDark ? '#27272a' : '#cbd5e1', inputBorderFocus: '#22d3ee' } } } }} theme={isDark ? "dark" : "default"} providers={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${themeBg} ${themeTextMain} font-sans overflow-hidden relative transition-colors duration-1000`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
        .animate-float-delayed { animation: float-slow 18s ease-in-out infinite; animation-delay: -5s; }
      `}} />

      <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${currentTheme.blob1} blur-[150px] rounded-full pointer-events-none animate-float-slow transition-colors duration-1000`}></div>
      <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${currentTheme.blob2} blur-[150px] rounded-full pointer-events-none animate-float-delayed transition-colors duration-1000`}></div>

      <nav className={`relative z-40 w-full backdrop-blur-md ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/50 border-slate-200'} border-b px-6 py-4 flex justify-between items-center transition-colors duration-500`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Command className={`w-6 h-6 ${isDark ? 'text-white' : 'text-slate-900'} transition-colors duration-500`} strokeWidth={2} />
            <span className={`text-lg font-bold tracking-tight hidden sm:block text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradient} transition-all duration-1000`}>
              ThePromptArchitect
            </span>
          </div>
          <div className={`hidden md:flex ${isDark ? 'bg-black/40 border-white/10' : 'bg-slate-200 border-slate-300'} border rounded-lg p-1 transition-colors duration-500`}>
            <button onClick={() => { playClickSound(); setView('build'); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all hover:scale-105 active:scale-95 ${view === 'build' ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-900 shadow') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700')}`}>Build</button>
            <button onClick={() => { playClickSound(); setView('community'); fetchCommunityPrompts(); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all hover:scale-105 active:scale-95 ${view === 'community' ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-900 shadow') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700')}`}><Users className="w-4 h-4" /> Community</button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => { playClickSound(); setSoundEnabled(!soundEnabled); }} className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}>{soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</button>
          <button onClick={() => { playClickSound(); setIsDark(!isDark); }} className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}>{isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          <button onClick={() => { playClickSound(); setIsHistoryOpen(true); }} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'}`}><History className="w-4 h-4" /><span className="hidden sm:block">History</span></button>
          <button onClick={() => { playClickSound(); supabase.auth.signOut(); }} className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 hover:bg-red-500/20 ${isDark ? 'text-zinc-400' : 'text-slate-500'} hover:text-red-500`}><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      {/* History Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 backdrop-blur-xl ${isDark ? 'bg-black/90 border-white/10' : 'bg-white/95 border-slate-200'} border-l p-6 transform transition-transform duration-500 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${currentTheme.icon} transition-colors duration-500`}><History className="w-5 h-5" /> Archive</h2>
          <button onClick={() => { playClickSound(); setIsHistoryOpen(false); }} className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto h-[calc(100vh-120px)] pb-10">
          {history.map((item) => (
            <div key={item.id} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-indigo-500/50 group`}>
              <div className="flex items-start justify-between gap-3 cursor-pointer w-full" onClick={() => { playClickSound(); setInput(item.original_idea); setOutput(item.refined_prompt); setMode(item.prompt_type || 'text'); setView('build'); setIsHistoryOpen(false); }}>
                <div className="flex items-start gap-3 overflow-hidden">
                  {item.prompt_type === 'image' ? <ImageIcon className="w-4 h-4 text-pink-500 mt-1 shrink-0" /> : item.prompt_type === 'video' ? <Video className="w-4 h-4 text-purple-500 mt-1 shrink-0" /> : <MessageSquare className="w-4 h-4 text-cyan-500 mt-1 shrink-0" />}
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{item.original_idea}</p>
                </div>
                <button onClick={(e) => handleDeletePrompt(item.id, e)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-zinc-500 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {view === 'build' ? (
          <div className="flex flex-col animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
                
                <div className={`backdrop-blur-md ${themeCardBg} border rounded-3xl p-6 sm:p-8 transition-colors duration-500`}>
                  <div className={`flex gap-2 p-1 border rounded-xl mb-6 w-fit transition-colors duration-500 ${isDark ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <button onClick={() => { playClickSound(); setMode('text'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${mode === 'text' ? (isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700')}`}><Type className="w-4 h-4" /> Text</button>
                    <button onClick={() => { playClickSound(); setMode('image'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${mode === 'image' ? (isDark ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-700 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700')}`}><ImageIcon className="w-4 h-4" /> Image</button>
                    <button onClick={() => { playClickSound(); setMode('video'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${mode === 'video' ? (isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700')}`}><Video className="w-4 h-4" /> Video</button>
                  </div>
                  <h1 className={`text-3xl font-bold mb-2 ${themeTextMain}`}>Craft the Perfect Prompt.</h1>
                  <p className={`${themeTextMuted} mb-6 text-sm`}>Dump your messy thoughts below. We will optimize it for {mode === 'text' ? 'ChatGPT/Claude' : mode === 'image' ? 'Midjourney/DALL-E' : 'Sora/Runway'}.</p>
                  
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={`What do you want to ${mode === 'text' ? 'write or build' : mode === 'image' ? 'see' : 'direct'}?`} className={`w-full h-32 border rounded-2xl p-5 focus:outline-none focus:ring-2 resize-none mb-4 transition-colors ${themeInputBg} ${mode === 'text' ? 'focus:ring-cyan-500/50' : mode === 'image' ? 'focus:ring-pink-500/50' : 'focus:ring-purple-500/50'}`} />
                  
                  {mode === 'image' && (
                    <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-4">
                      <div><label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${themeTextMuted}`}>Art Style / Medium</label><input type="text" value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="e.g., 3D Render" className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors ${themeInputBg}`} /></div>
                      <div><label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${themeTextMuted}`}>Lighting / Mood</label><input type="text" value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="e.g., Cinematic lighting" className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors ${themeInputBg}`} /></div>
                    </div>
                  )}
                  {mode === 'video' && (
                    <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-4">
                      <div><label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${themeTextMuted}`}>Camera Movement</label><input type="text" value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="e.g., Drone flyover" className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors ${themeInputBg}`} /></div>
                      <div><label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${themeTextMuted}`}>Pacing / Vibe</label><input type="text" value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="e.g., Fast-paced" className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors ${themeInputBg}`} /></div>
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <button onClick={handleGenerate} disabled={isLoading || !input} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 text-white bg-gradient-to-r ${currentTheme.button} shadow-lg duration-500`}>
                      {isLoading ? "Synthesizing..." : <>Generate Magic <Zap className="w-4 h-4" /></>}
                    </button>
                  </div>
                </div>

                <div className={`backdrop-blur-md ${themeCardBg} border-l-4 rounded-3xl p-6 sm:p-8 transition-colors duration-500 ${currentTheme.border}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <label className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider transition-colors duration-500 ${currentTheme.icon}`}>
                      <Sparkles className="w-4 h-4" /> Optimized Output
                    </label>
                    <div className="flex items-center gap-3">
                      {currentPromptId && output && !isTyping && (
                        <button onClick={togglePublish} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 ${isCurrentPublic ? 'bg-green-500/10 border-green-500/30 text-green-500' : (isDark ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')}`}>
                          <Globe className="w-3 h-3" /> {isCurrentPublic ? 'Live in Community' : 'Publish'}
                        </button>
                      )}
                      <button onClick={() => copyToClipboard(output)} disabled={!output || isTyping} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'}`}>
                        {copied ? "Copied!" : "Copy Prompt"}
                      </button>
                    </div>
                  </div>
                  
                  <div className={`rounded-2xl p-6 leading-relaxed whitespace-pre-wrap font-mono text-sm border overflow-x-auto min-h-[150px] transition-colors duration-500 ${isDark ? 'bg-black/40 text-zinc-200 border-white/5' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                    {displayedOutput || (!isTyping && <span className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} italic`}>Awaiting your instructions...</span>)}
                    {isTyping && <span className={`animate-pulse transition-colors duration-500 ${currentTheme.icon}`}>|</span>}
                  </div>
                </div>

              </div>

              <div className="col-span-1 hidden lg:flex flex-col gap-6">
                
                <div className={`backdrop-blur-md bg-gradient-to-br ${isDark ? 'from-white/5 to-black border-white/10' : 'from-white to-slate-50 border-slate-200 shadow-lg'} border rounded-3xl p-6 h-48 transition-colors duration-500`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg transition-colors duration-500 ${currentTheme.iconBg}`}><Lightbulb className={`w-5 h-5 transition-colors duration-500 ${currentTheme.icon}`} /></div>
                    <h3 className={`font-semibold ${themeTextMain}`}>Pro Prompting Tips</h3>
                  </div>
                  <div className="relative h-full">
                    {TIPS[mode].map((tip, index) => (
                      <p key={index} className={`absolute top-0 left-0 ${themeTextMuted} text-sm leading-relaxed transition-all duration-1000 ${index === currentTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        "{tip}"
                      </p>
                    ))}
                  </div>
                </div>

                <div className={`backdrop-blur-md bg-gradient-to-br ${isDark ? 'from-white/5 to-black border-white/10' : 'from-white to-slate-50 border-slate-200 shadow-lg'} border rounded-3xl p-6 flex-1 flex flex-col min-h-[300px] transition-colors duration-500`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg transition-colors duration-500 ${currentTheme.iconBg}`}>
                      <Activity className={`w-5 h-5 transition-colors duration-500 ${currentTheme.icon}`} />
                    </div>
                    <h3 className={`font-semibold ${themeTextMain}`}>Your Architect Stats</h3>
                  </div>

                  <div className="flex flex-col gap-4 flex-1 justify-center">
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-500 ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <Terminal className={`w-4 h-4 ${themeTextMuted}`} />
                        <span className={`text-sm font-medium ${themeTextMuted}`}>Total Generated</span>
                      </div>
                      <span className={`text-xl font-bold ${themeTextMain}`}>{stats.total}</span>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-500 ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <PieChart className={`w-4 h-4 ${themeTextMuted}`} />
                        <span className={`text-sm font-medium ${themeTextMuted}`}>Top Format</span>
                      </div>
                      <span className={`text-sm font-bold uppercase tracking-wider transition-colors duration-500 ${stats.topMode === 'Text' ? 'text-cyan-500' : stats.topMode === 'Image' ? 'text-pink-500' : 'text-purple-500'}`}>{stats.topMode}</span>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-500 ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <Globe className={`w-4 h-4 ${themeTextMuted}`} />
                        <span className={`text-sm font-medium ${themeTextMuted}`}>Public Shared</span>
                      </div>
                      <span className={`text-xl font-bold ${themeTextMain}`}>{stats.publicShared}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-24 mb-12 animate-in fade-in duration-700">
              <div className="text-center mb-16">
                <h2 className={`text-3xl md:text-4xl font-bold text-transparent bg-clip-text transition-colors duration-500 ${isDark ? 'bg-gradient-to-r from-white to-zinc-400' : 'bg-gradient-to-r from-slate-900 to-slate-500'} mb-4`}>Why Prompt Engineering Matters.</h2>
                <p className={`${themeTextMuted} max-w-2xl mx-auto text-sm md:text-base leading-relaxed`}>Generative AI models are powerful, but they operate exactly like highly literal interns. If you give them vague instructions, you get generic, hallucinated, or unhelpful results.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                <div className={`bg-gradient-to-b ${isDark ? 'from-white/5 to-transparent border-white/10 hover:border-cyan-500/30' : 'from-white to-slate-50 border-slate-200 hover:border-cyan-500 shadow-sm'} border rounded-2xl p-6 transition-colors`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-500 ${currentTheme.iconBg}`}><Terminal className={`w-5 h-5 transition-colors duration-500 ${currentTheme.icon}`} /></div>
                  <h3 className={`text-lg font-bold mb-2 ${themeTextMain}`}>Absolute Precision</h3>
                  <p className={`text-sm ${themeTextMuted} leading-relaxed`}>Stop hoping the AI guesses what you want. By explicitly defining the Persona and Format, you force the model to output exactly what you need on the very first try.</p>
                </div>
                <div className={`bg-gradient-to-b ${isDark ? 'from-white/5 to-transparent border-white/10 hover:border-indigo-500/30' : 'from-white to-slate-50 border-slate-200 hover:border-indigo-500 shadow-sm'} border rounded-2xl p-6 transition-colors`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-500 ${currentTheme.iconBg}`}><Lock className={`w-5 h-5 transition-colors duration-500 ${currentTheme.icon}`} /></div>
                  <h3 className={`text-lg font-bold mb-2 ${themeTextMain}`}>Constraint Enforcement</h3>
                  <p className={`text-sm ${themeTextMuted} leading-relaxed`}>The best way to control AI is by telling it what *not* to do. Setting hard constraints prevents AI from using corporate jargon or rambling off-topic.</p>
                </div>
                <div className={`bg-gradient-to-b ${isDark ? 'from-white/5 to-transparent border-white/10 hover:border-purple-500/30' : 'from-white to-slate-50 border-slate-200 hover:border-purple-500 shadow-sm'} border rounded-2xl p-6 transition-colors`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-500 ${currentTheme.iconBg}`}><Zap className={`w-5 h-5 transition-colors duration-500 ${currentTheme.icon}`} /></div>
                  <h3 className={`text-lg font-bold mb-2 ${themeTextMain}`}>Workflow Velocity</h3>
                  <p className={`text-sm ${themeTextMuted} leading-relaxed`}>Instead of spending 20 minutes arguing with ChatGPT, a perfectly architected prompt gets you production-ready code or copy instantly.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-8">
              <h1 className={`text-3xl font-bold flex items-center gap-3 ${themeTextMain}`}><Users className="w-8 h-8 text-indigo-500" /> Community Prompts</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {communityPrompts.map((prompt) => (
                  <div key={prompt.id} className={`backdrop-blur-md ${themeCardBg} border rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform`}>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                         {prompt.prompt_type === 'image' ? <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-500/20 text-pink-500 px-2 py-1 rounded-md">Image</span> : prompt.prompt_type === 'video' ? <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-500 px-2 py-1 rounded-md">Video</span> : <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-500 px-2 py-1 rounded-md">Text</span>}
                      </div>
                      <h3 className={`font-medium mb-2 line-clamp-2 ${themeTextMain}`}>"{prompt.original_idea}"</h3>
                      <p className={`text-xs line-clamp-4 font-mono mb-4 p-3 rounded-xl border ${isDark ? 'text-zinc-500 bg-black/40 border-white/5' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>{prompt.refined_prompt}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      <footer className={`w-full py-16 mt-auto text-center border-t transition-colors duration-500 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
        <p className={`text-3xl md:text-5xl font-extrabold tracking-widest uppercase opacity-80 text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradient} transition-all duration-1000`}>
          Built by Pramath
        </p>
      </footer>

      {isHistoryOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => { playClickSound(); setIsHistoryOpen(false); }}></div>}
    </div>
  );
}