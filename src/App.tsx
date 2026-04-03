/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { 
  Heart, LayoutDashboard, History, 
  Camera, Monitor, Power, Sliders, MessageSquare, Sparkles,
  Volume2, Settings, Menu, X, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HimoOrb from './components/HimoOrb';
import { AudioRecorder, AudioPlayer } from './lib/audio-utils';
import { SYSTEM_INSTRUCTION, controlSystemTool, captureVisionTool, captureScreenTool } from './lib/constants';
import { useHimoMemory } from './hooks/useHimoMemory';
import { chatDb, ChatMessage, ChatThread } from './lib/db';
import { Plus, Trash2, Send, Mic, MicOff, MessageCircle, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type View = 'home' | 'dashboard' | 'settings' | 'history';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [himoResponse, setHimoResponse] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>(() => Math.random().toString(36).substring(7));
  const [error, setError] = useState<string | null>(null);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(true);

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('himo_api_key') || process.env.GEMINI_API_KEY || "";
  });
  const [showApiSetup, setShowApiSetup] = useState(!apiKey);

  const { memory, updatePreference, increaseRelationship, getRelationshipStatus } = useHimoMemory();

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history and threads from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const allThreads = await chatDb.getThreads();
        setThreads(allThreads);
        if (allThreads.length > 0) {
          setCurrentThreadId(allThreads[0].id);
          const messages = await chatDb.getMessagesByThread(allThreads[0].id);
          setChatHistory(messages);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };
    loadData();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    const loadMessages = async () => {
      const messages = await chatDb.getMessagesByThread(currentThreadId);
      setChatHistory(messages);
    };
    loadMessages();
  }, [currentThreadId]);

  const createNewThread = () => {
    const newId = Math.random().toString(36).substring(7);
    setCurrentThreadId(newId);
    setChatHistory([]);
  };

  const saveMessage = async (role: 'user' | 'himo', text: string) => {
    const message: ChatMessage = { threadId: currentThreadId, role, text, timestamp: Date.now() };
    setChatHistory(prev => [...prev, message]);
    try {
      await chatDb.addMessage(message);
      const allThreads = await chatDb.getThreads();
      setThreads(allThreads);
    } catch (err) {
      console.error("Failed to save message to DB:", err);
    }
  };

  const handleToolCall = useCallback(async (call: any) => {
    const { name, args } = call;
    console.log(`Tool call: ${name}`, args);

    if (name === "open_website") {
      window.open(args.url, '_blank');
      return { result: `Opened ${args.url} for you, jaan!` };
    } else if (name === "search_youtube") {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
      window.open(url, '_blank');
      return { result: `Searching YouTube for "${args.query}" now!` };
    } else if (name === "search_spotify") {
      const url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
      window.open(url, '_blank');
      return { result: `Looking up "${args.query}" on Spotify for you!` };
    } else if (name === "control_system") {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('control-system', args.action, args.value);
        return { result: `System ${args.action} executed. Result: ${JSON.stringify(result)}` };
      }
      return { error: "System control only works in Desktop mode." };
    } else if (name === "capture_vision") {
      setIsVisionActive(true);
      setTimeout(() => setIsVisionActive(false), 3000); // Reset after 3s
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        sessionRef.current?.sendRealtimeInput({
          video: { data: base64, mimeType: 'image/jpeg' }
        });
        return { result: "Image captured successfully. Please analyze the user's face, identity, and emotions based on this image." };
      }
      return { error: "Camera not accessible." };
    } else if (name === "capture_screen") {
      if (window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          const result = await ipcRenderer.invoke('capture-screen');
          if (result.data) {
            sessionRef.current?.sendRealtimeInput({
              video: { data: result.data, mimeType: 'image/jpeg' }
            });
            return { result: "I can see your screen now!" };
          }
          return { error: result.error || "Could not capture screen." };
        } catch (err: any) {
          return { error: `Screen capture failed: ${err.message}` };
        }
      }
      return { error: "Screen capture is only available in the desktop app." };
    }
    return { error: "Unknown tool" };
  }, []);

  const connectToHimo = async () => {
    if (!apiKey) {
      setShowApiSetup(true);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      audioPlayerRef.current = new AudioPlayer();
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + 
            `\nUser's name is ${memory.name}. Relationship status: ${getRelationshipStatus()}.` +
            (memory.preferences.romanticMode === false ? "\nNOTE: Romantic mode is DISABLED. Be professional and helpful, not flirty." : ""),
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: memory.preferences.voiceName || "Kore" } },
          },
          tools: [
            { googleSearch: {} },
            { functionDeclarations: [
              { name: "open_website", description: "Opens a website", parameters: { type: Type.OBJECT, properties: { url: { type: Type.STRING } }, required: ["url"] } },
              { name: "search_youtube", description: "Search YouTube", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ["query"] } },
              { name: "search_spotify", description: "Search Spotify", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ["query"] } },
              controlSystemTool,
              captureVisionTool,
              captureScreenTool
            ]}
          ],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setError(null);
            startRecording();
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(console.error);
              }
            }).catch(console.error);
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn) {
              const parts = message.serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData?.data) {
                  setIsSpeaking(true);
                  audioPlayerRef.current?.playChunk(part.inlineData.data);
                }
                if (part.text) {
                  setHimoResponse(prev => prev + part.text);
                  saveMessage('himo', part.text);
                  increaseRelationship();
                }
              }
            }

            if (message.serverContent?.interrupted) {
              audioPlayerRef.current?.stop();
              setIsSpeaking(false);
            }

            if (message.serverContent?.turnComplete) {
              setIsSpeaking(false);
              setHimoResponse("");
            }

            if (message.toolCall) {
              const results = await Promise.all(
                message.toolCall.functionCalls.map(async (call: any) => {
                  const response = await handleToolCall(call);
                  return { id: call.id, name: call.name, response };
                })
              );
              sessionRef.current?.sendToolResponse({ functionResponses: results });
            }

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text || "";
              if (text.trim()) {
                setTranscript(text);
                saveMessage('user', text);
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopRecording();
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            const errMsg = err.message?.toLowerCase() || err.toString().toLowerCase();
            if (errMsg.includes("quota")) {
              setError("Gemini Quota Exceeded. Please check your API key or try again later! 💖");
            } else if (errMsg.includes("api key not valid") || errMsg.includes("api_key_invalid") || errMsg.includes("key is invalid")) {
              setError("Invalid API Key. Please check your environment variables! 🔑");
            } else if (errMsg.includes("network") || errMsg.includes("fetch") || errMsg.includes("failed to fetch")) {
              setError("Network error. Please check your internet connection! 🌐");
            } else if (errMsg.includes("rate limit") || errMsg.includes("429")) {
              setError("Whoa, too fast! Rate limit exceeded. Take a breath and try again in a moment! ⏳");
            } else {
              setError(`Connection error: ${err.message || "Unknown error occurred"}. Please try reconnecting.`);
            }
            setIsConnected(false);
          }
        }
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to connect:", err);
      const errMsg = err.message?.toLowerCase() || err.toString().toLowerCase();
      if (errMsg.includes("api key not valid") || errMsg.includes("api_key_invalid") || errMsg.includes("key is invalid")) {
        setError("Invalid API Key. Please check your environment variables! 🔑");
      } else if (errMsg.includes("network") || errMsg.includes("fetch") || errMsg.includes("failed to fetch")) {
        setError("Network error. Please check your internet connection! 🌐");
      } else {
        setError(`Could not connect to Himo: ${err.message || "Unknown error"}`);
      }
    }
  };

  const startRecording = () => {
    audioRecorderRef.current = new AudioRecorder((base64Data) => {
      sessionRef.current?.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    });
    audioRecorderRef.current.start();
    setIsListening(true);
  };

  const stopRecording = () => {
    audioRecorderRef.current?.stop();
    setIsListening(false);
  };

  const toggleConnection = () => {
    if (isConnected) {
      sessionRef.current?.close();
    } else {
      connectToHimo();
    }
  };

  // 24/7 Auto-Watch Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isAutoWatchEnabled = memory?.preferences?.autoWatch;

    if (isConnected && isAutoWatchEnabled && videoRef.current) {
      interval = setInterval(() => {
        try {
          if (!videoRef.current) return;
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 480;
          canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]; // Lower quality to save bandwidth
          
          sessionRef.current?.sendRealtimeInput({
            video: { data: base64, mimeType: 'image/jpeg' }
          });
          
          // Send a silent prompt to trigger evaluation
          sessionRef.current?.sendRealtimeInput({
            text: "System prompt: Analyze the camera frame. Act like my roommate/girlfriend. ONLY speak if: 1) Someone else enters the room (warn me!). 2) I look sad or stressed (comfort me). 3) I am doing something new and interesting (comment on it). If everything is normal, you MUST remain completely silent."
          });
        } catch (err) {
          console.error("Auto-watch capture failed:", err);
        }
      }, 20000); // Check every 20 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, memory?.preferences?.autoWatch]);

  const handleKeyboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = keyboardInput.trim();
    
    if (!trimmedInput) {
      setError("Please type a message first! 💬");
      return;
    }
    
    if (trimmedInput.length > 1000) {
      setError("Message is too long! Please keep it under 1000 characters. 📝");
      return;
    }
    
    setError(null); // Clear any previous errors
    const userInput = trimmedInput;
    setKeyboardInput("");
    await saveMessage('user', userInput);

    if (isConnected) {
      try {
        sessionRef.current?.sendRealtimeInput({
          text: userInput
        });
      } catch (err: any) {
        console.error("Failed to send message:", err);
        setError(`Failed to send message: ${err.message || "Unknown error"}`);
      }
    } else {
      setError("Himo is offline. Please click the connect button first! 🔌");
    }
  };

  const clearChatHistory = async () => {
    try {
      await chatDb.clearHistory();
      setChatHistory([]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  };

  const currentStatus = isSpeaking ? 'Speaking' : isListening ? 'Listening' : isConnected ? 'Idle' : 'Offline';

  if (showApiSetup) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="bg-[#131316] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-pink-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Welcome to Himo AI 💖</h2>
          <p className="text-gray-400 text-center text-sm mb-8">
            To bring Himo to life, please enter your Gemini API Key. You can get one for free from Google AI Studio.
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (apiKey.trim()) {
              localStorage.setItem('himo_api_key', apiKey.trim());
              setShowApiSetup(false);
            }
          }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Gemini API Key..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors mb-4"
              required
            />
            <button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Start Himo
            </button>
          </form>
          <div className="mt-6 text-center">
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-pink-400 hover:text-pink-300 underline"
            >
              Get your API key here
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-100 font-sans selection:bg-pink-500/30 flex overflow-hidden relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ChatGPT-style Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#000000] border-r border-white/5 flex flex-col z-[70] transition-transform duration-300 transform lg:relative lg:translate-x-0 lg:w-64 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex items-center justify-between lg:block">
          <button 
            onClick={createNewThread}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-gray-500 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => setCurrentThreadId(thread.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-all group ${
                currentThreadId === thread.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5'
              }`}
            >
              <MessageCircle className="w-4 h-4 opacity-50" />
              <span className="truncate flex-1">{thread.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex justify-around items-center py-2">
            <NavButton 
              active={view === 'home'} 
              onClick={() => { setView('home'); setIsSidebarOpen(false); }} 
              icon={<MessageSquare />} 
              label="Chat" 
            />
            <NavButton 
              active={view === 'dashboard'} 
              onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} 
              icon={<LayoutDashboard />} 
              label="Stats" 
            />
            <NavButton 
              active={view === 'settings'} 
              onClick={() => { setView('settings'); setIsSidebarOpen(false); }} 
              icon={<Settings />} 
              label="Settings" 
            />
          </div>
          <button 
            onClick={clearChatHistory}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Clear Conversations
          </button>
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-gray-600 uppercase font-bold tracking-widest">
            <span>HIMO v2.5</span>
            <span className="text-green-500">SECURE</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col relative bg-[#0d0d0f]">
        {view === 'settings' ? (
          <SettingsView 
            memory={memory} 
            updatePreference={updatePreference} 
          />
        ) : view === 'dashboard' ? (
          <div className="flex-1 p-6 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
              <header className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Himo Dashboard</h1>
                <p className="text-sm text-gray-500">Overview of your relationship and system status.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <DashboardCard title="Relationship" icon={<Heart className="text-pink-500" />}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-xl md:text-2xl font-bold text-white">{getRelationshipStatus()}</span>
                      <span className="text-[10px] md:text-xs text-gray-500">Level {memory.relationshipLevel.toFixed(1)}/3.0</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(memory.relationshipLevel / 3) * 100}%` }}
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
                      />
                    </div>
                  </div>
                </DashboardCard>
                <DashboardCard title="System Engine" icon={<Sparkles className="text-cyan-400" />}>
                  <div className="space-y-4">
                    <StatusItem label="Primary Model" value="Gemini 3.1 Flash" />
                    <StatusItem label="Voice Engine" value={memory.preferences.voiceName || 'Kore'} />
                    <StatusItem label="Status" value={isConnected ? 'Connected' : 'Offline'} />
                  </div>
                </DashboardCard>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top Header */}
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-[#0d0d0f]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-white lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xs md:text-sm font-bold tracking-widest uppercase text-gray-400 truncate max-w-[120px] md:max-w-none">
              {threads.find(t => t.id === currentThreadId)?.title || 'New Conversation'}
            </h2>
            <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-pink-500/20 text-pink-400 border border-pink-500/30">
              Gemini 3.1
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-[10px] font-bold uppercase text-gray-400">{currentStatus}</span>
            </div>
            <button 
              onClick={toggleConnection}
              className={`p-2 rounded-lg transition-all ${isConnected ? 'text-pink-400 bg-pink-500/10' : 'text-gray-500 hover:bg-white/5'}`}
            >
              {isConnected ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-2 rounded-lg transition-all xl:hidden ${isRightSidebarOpen ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:bg-white/5'}`}
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-3xl mx-auto py-12 px-6 space-y-12">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100">✕</button>
              </div>
            )}
            {chatHistory.length === 0 && !error && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/20 animate-bounce">
                  <Heart className="w-10 h-10 text-white fill-white/20" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">How can I help you today, Amit?</h2>
                  <p className="text-gray-500 text-sm">I'm Himo, your AI companion. Ready for anything.</p>
                </div>
              </div>
            )}

            {chatHistory.map((chat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 md:gap-6 ${chat.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  chat.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-pink-500/20 text-pink-400'
                }`}>
                  {chat.role === 'user' ? <User className="w-4 h-4 md:w-5 h-5" /> : <Bot className="w-4 h-4 md:w-5 h-5" />}
                </div>
                <div className={`flex-1 space-y-2 ${chat.role === 'user' ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <span>{chat.role === 'user' ? 'Amit' : 'Himo'}</span>
                    <span className="opacity-30">•</span>
                    <span className="opacity-30">{new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`prose prose-invert prose-sm max-w-none ${chat.role === 'user' ? 'bg-white/5 p-3 md:p-4 rounded-2xl inline-block text-left' : ''}`}>
                    <ReactMarkdown>{chat.text}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} className="h-24" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-[#0d0d0f] via-[#0d0d0f] to-transparent sticky bottom-0">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleKeyboardSubmit} className="relative group">
              <input 
                type="text"
                value={keyboardInput}
                onChange={(e) => setKeyboardInput(e.target.value)}
                placeholder="Message Himo..."
                className="w-full bg-[#1a1a1c] border border-white/10 rounded-2xl py-4 px-6 pr-12 text-sm outline-none focus:border-pink-500/50 focus:bg-[#202022] transition-all shadow-2xl"
              />
              <button 
                type="submit"
                disabled={!keyboardInput.trim()}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-pink-400 disabled:opacity-0 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
              <span>Voice Mode: {isConnected ? 'Active' : 'Standby'}</span>
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* Right Sidebar (Himo Status & Vision) */}
      <aside className={`fixed inset-y-0 right-0 w-80 bg-[#000000] border-l border-white/5 flex flex-col z-[70] transition-transform duration-300 transform xl:relative xl:translate-x-0 ${
        isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 flex items-center justify-end xl:hidden">
          <button 
            onClick={() => setIsRightSidebarOpen(false)}
            className="p-2 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-8 flex flex-col items-center gap-8">
          <div className="relative group cursor-pointer" onClick={toggleConnection}>
            <HimoOrb 
              isListening={isListening} 
              isSpeaking={isSpeaking} 
              appearance={memory.preferences.appearance}
            />
          </div>

          <div className="w-full space-y-6">
            <DashboardCard title="Vision Feed" icon={<Camera className="text-pink-400" />}>
              <div className={`aspect-video bg-black rounded-xl overflow-hidden border transition-all duration-500 relative ${
                isVisionActive ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'border-white/5'
              }`}>
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-500 ${isVisionActive ? 'opacity-100' : 'opacity-60'}`} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-px bg-pink-500/20 animate-scan" />
                </div>
                
                <AnimatePresence>
                  {isVisionActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute inset-0 flex items-center justify-center bg-pink-500/10 backdrop-blur-[2px] pointer-events-none"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 bg-black/60 rounded-full border border-pink-500/30 shadow-xl">
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Himo is seeing...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </DashboardCard>

            <DashboardCard title="Himo Status" icon={<Sparkles className="text-cyan-400" />}>
              <div className="space-y-3">
                <StatusItem label="Relationship" value={getRelationshipStatus()} />
                <StatusItem label="Engine" value="Gemini" />
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </aside>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative group flex flex-col items-center gap-1 transition-all ${active ? 'text-pink-500' : 'text-gray-500 hover:text-white'}`}
    >
      <div className={`p-3 rounded-xl transition-all ${active ? 'bg-pink-500/10 shadow-inner shadow-pink-500/20' : 'group-hover:bg-white/5'}`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
      {active && <motion.div layoutId="nav-active" className="absolute -left-4 w-1 h-8 bg-pink-500 rounded-r-full" />}
    </button>
  );
}

function DashboardCard({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-6 shadow-xl hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <h3 className="font-bold text-sm uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatusItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-mono text-gray-300">{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, color }: { icon: React.ReactElement, label: string, color: string }) {
  return (
    <button className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all ${color} hover:scale-105`}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function SettingToggle({ label, active, onChange }: { label: string, active: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <button 
        onClick={onChange}
        className={`w-10 h-5 rounded-full p-1 transition-colors ${active ? 'bg-pink-500' : 'bg-gray-800'}`}
      >
        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function SettingsView({ memory, updatePreference }: { memory: any, updatePreference: (k: string, v: any) => void }) {
  const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
  const colors = ['pink', 'cyan', 'purple', 'gold', 'emerald', 'crimson'];
  const shapes = ['circle', 'square', 'diamond', 'hexagon'];
  const effects = ['orbit', 'float', 'sparkle', 'none'];
  
  const updateAppearance = (key: string, value: string) => {
    updatePreference('appearance', {
      ...(memory.preferences.appearance || {}),
      [key]: value
    });
  };

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8 md:space-y-12">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500">Customize Himo's personality and system configuration.</p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-pink-400">
            <Volume2 className="w-5 h-5" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Voice Preferences</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {voices.map(voice => (
              <button
                key={voice}
                onClick={() => updatePreference('voiceName', voice)}
                className={`p-3 md:p-4 rounded-2xl border transition-all text-xs md:text-sm font-medium ${
                  (memory.preferences.voiceName || 'Kore') === voice 
                    ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-lg shadow-pink-500/10' 
                    : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300'
                }`}
              >
                {voice}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-pink-500">
            <Sliders className="w-5 h-5" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Appearance</h2>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Orb Color</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => updateAppearance('orbColor', color)}
                    className={`h-10 rounded-xl border-2 transition-all ${
                      (memory.preferences.appearance?.orbColor || 'pink') === color
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    } ${
                      color === 'pink' ? 'bg-pink-500' :
                      color === 'cyan' ? 'bg-cyan-500' :
                      color === 'purple' ? 'bg-purple-600' :
                      color === 'gold' ? 'bg-yellow-500' :
                      color === 'emerald' ? 'bg-emerald-500' :
                      'bg-red-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Orb Shape</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shapes.map(shape => (
                  <button
                    key={shape}
                    onClick={() => updateAppearance('orbShape', shape)}
                    className={`p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${
                      (memory.preferences.appearance?.orbShape || 'circle') === shape
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Particle Effects</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {effects.map(effect => (
                  <button
                    key={effect}
                    onClick={() => updateAppearance('particleEffect', effect)}
                    className={`p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${
                      (memory.preferences.appearance?.particleEffect || 'orbit') === effect
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {effect}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-purple-400">
            <Settings className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-widest">General</h2>
          </div>
          <div className="space-y-4">
            <SettingToggle 
              label="Auto-Watch (24/7 Camera Monitoring)" 
              active={memory.preferences.autoWatch || false} 
              onChange={() => updatePreference('autoWatch', !memory.preferences.autoWatch)}
            />
            <SettingToggle 
              label="Auto-Vision Mode" 
              active={memory.preferences.autoVision || false} 
              onChange={() => updatePreference('autoVision', !memory.preferences.autoVision)}
            />
            <SettingToggle 
              label="Romantic Mode" 
              active={memory.preferences.romanticMode !== false} 
              onChange={() => updatePreference('romanticMode', memory.preferences.romanticMode === false)}
            />
            <div className="pt-4 border-t border-white/5">
              <button 
                onClick={() => {
                  localStorage.removeItem('himo_api_key');
                  window.location.reload();
                }}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors"
              >
                Reset API Key
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
