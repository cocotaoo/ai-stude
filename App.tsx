
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, ChatSession, Message, QuizData, MindMapNode, FileData, WPBlock } from './types';
import { loadState, saveState } from './utils/storage';
import { AIService } from './services/ai';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import RightPanel from './components/RightPanel';
import SettingsDialog from './components/SettingsDialog';

// Runtime safety check: Define global process after imports
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const App: React.FC = () => {
  // Safety: Use static references. Vite's 'define' replaces these literal strings at build time.
  const getEnvValue = (key: 'API_KEY' | 'SITE_PASSWORD', fallback: string): string => {
    if (key === 'API_KEY') {
      return process.env.API_KEY || fallback;
    }
    if (key === 'SITE_PASSWORD') {
      return process.env.SITE_PASSWORD || fallback;
    }
    return fallback;
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('scholar_auth_v1') === btoa('access_granted');
  });
  
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [state, setState] = useState<AppState>(loadState);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'quiz' | 'mindmap' | 'knowledge' | 'weakness'>('mindmap');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = getEnvValue('SITE_PASSWORD', 'admin888');
    
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('scholar_auth_v1', btoa('access_granted'));
      setAuthError(false);
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 900) setPanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) setNeedsApiKey(true);
      }
    };
    if (isAuthenticated) checkApiKey();
  }, [isAuthenticated]);

  const handleOpenSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setNeedsApiKey(false);
    }
  };

  const parseActionsFromContent = useCallback((content: string, messageId: string) => {
    const quizzes: QuizData[] = [];
    const mindMaps: MindMapNode[] = [];
    const wps: string[] = [];
    const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?})\s*```/gi;
    let match;
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const actionData = JSON.parse(match[1]);
        if (actionData.action === 'GENERATE_QUIZ') {
          const quiz = actionData.data;
          quiz.id = quiz.id || messageId;
          if (state.quizResults[quiz.id]) quiz.results = state.quizResults[quiz.id];
          quizzes.push(quiz);
        }
        if (actionData.action === 'GENERATE_MINDMAP') mindMaps.push(actionData.data);
        if (actionData.action === 'SUGGEST_WEAK_POINT') wps.push(actionData.data.content);
      } catch (e) {}
    }
    return { quizzes, mindMaps, wps };
  }, [state.quizResults]);

  const artifacts = useMemo(() => {
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
    if (!activeSession) return { quizzes: [], mindMaps: [] };
    const quizzes: QuizData[] = [];
    const mindMaps: MindMapNode[] = [];
    activeSession.messages.forEach(msg => {
      if (msg.role === 'assistant') {
        const found = parseActionsFromContent(msg.content, msg.id);
        quizzes.push(...found.quizzes);
        mindMaps.push(...found.mindMaps);
      }
    });
    return { quizzes, mindMaps };
  }, [state.activeSessionId, state.sessions, parseActionsFromContent]);

  useEffect(() => {
    if (artifacts.quizzes.length > 0 && !state.currentQuiz) {
       setState(prev => ({ ...prev, currentQuiz: artifacts.quizzes[0] }));
    }
    if (artifacts.mindMaps.length > 0 && !state.currentMindMap) {
       setState(prev => ({ ...prev, currentMindMap: artifacts.mindMaps[0] }));
    }
  }, [artifacts, state.currentQuiz, state.currentMindMap]);

  useEffect(() => { 
    if (isAuthenticated) saveState(state); 
  }, [state, isAuthenticated]);

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null;
  const activeConfig = state.configs.find(c => c.id === state.activeConfigId) || state.configs[0];

  const handleSendMessage = async (content: string, files?: FileData[], customMessages?: Message[]) => {
    if (!activeSession) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now(), files };
    const baseMessages = customMessages || activeSession.messages;
    const updatedMessages = [...baseMessages, userMsg];
    
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === activeSession.id ? { ...s, messages: updatedMessages } : s)
    }));

    setIsLoading(true);
    setError(null);

    try {
      const aiService = new AIService(activeConfig);
      const result = await aiService.generateResponse(updatedMessages, {
        customPrompt: activeSession.customPrompt,
        kb: state.knowledgeBase,
        wp: state.weakPoints,
        useKB: activeSession.settings.useKnowledgeBase,
        useWP: activeSession.settings.useWeakPoints
      });
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.text, timestamp: Date.now() };
      const found = parseActionsFromContent(result.text, aiMsg.id);

      if (found.wps.length > 0) {
        const newWPs: WPBlock[] = found.wps.map(c => ({ id: Date.now().toString() + Math.random(), content: c, timestamp: Date.now(), status: 'suggested' }));
        setState(prev => ({ ...prev, weakPoints: [...newWPs, ...prev.weakPoints] }));
      }

      const finalMessages = [...updatedMessages, aiMsg];
      setState(prev => ({
        ...prev,
        totalTokensUsed: prev.totalTokensUsed + (result.usage || 0),
        sessions: prev.sessions.map(s => s.id === activeSession.id ? { 
          ...s, 
          messages: finalMessages,
          title: s.messages.length === 0 ? (content.slice(0, 15) || '新研究') : s.title 
        } : s)
      }));
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleQuizSubmit = (quizId: string, results: QuizData['results'], feedback?: string) => {
    setState(prev => ({
      ...prev,
      quizResults: { ...prev.quizResults, [quizId]: results },
      currentQuiz: prev.currentQuiz?.id === quizId ? { ...prev.currentQuiz, results } : prev.currentQuiz
    }));
    if (feedback) handleSendMessage(feedback);
  };

  const handleUpdateSession = (id: string, updates: Partial<ChatSession>) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-[#000000] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
        </div>
        
        <form onSubmit={handleLogin} className="relative z-10 glass border border-white/10 p-10 md:p-14 rounded-[48px] w-full max-w-md shadow-2xl space-y-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF] to-[#0051FF] rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30">
               <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Scholar AI</h1>
            <p className="text-sm text-[#86868B] font-medium tracking-wide">请输入站点访问密码</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <input 
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-8 py-5 bg-white/5 border rounded-[22px] text-white text-center text-xl outline-none transition-all focus:ring-4 ${authError ? 'border-rose-500/50 focus:ring-rose-500/10' : 'border-white/10 focus:border-[#0A84FF] focus:ring-blue-500/10'}`}
                autoFocus
              />
              {authError && <p className="text-rose-500 text-[11px] font-black uppercase tracking-[0.2em] text-center pt-2">密码验证失败</p>}
            </div>
            <button type="submit" className="w-full py-5 bg-white text-black rounded-[22px] font-black text-[14px] uppercase tracking-[0.3em] shadow-2xl hover:bg-[#F5F5F7] active:scale-[0.98] transition-all">确认身份</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-[#F5F5F7] overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={state.sessions} activeId={state.activeSessionId}
        onSelect={(id) => setState(prev => ({ ...prev, activeSessionId: id, currentQuiz: null, currentMindMap: null }))}
        onNewChat={() => {
          const s: ChatSession = { id: Date.now().toString(), title: '新会话', messages: [], createdAt: Date.now(), settings: { useKnowledgeBase: true, useWeakPoints: true, useMCP: true } };
          setState(prev => ({ ...prev, sessions: [s, ...prev.sessions], activeSessionId: s.id }));
        }}
        onDelete={(id) => setState(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== id), activeSessionId: prev.activeSessionId === id ? null : prev.activeSessionId }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onUpdateSession={handleUpdateSession}
        onExportArchive={() => {}} 
        onImportArchive={() => {}}
      />
      
      <main className="flex-1 flex overflow-hidden">
        <ChatInterface 
          session={activeSession} onSend={handleSendMessage} isLoading={isLoading} error={error}
          isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(true)}
          isPanelOpen={isPanelOpen} togglePanel={() => setIsPanelOpen(!isPanelOpen)}
          isDarkMode={true} toggleDarkMode={() => {}}
          onUpdateSettings={(up) => activeSession && handleUpdateSession(activeSession.id, { settings: { ...activeSession.settings, ...up } })}
          onUpdateSession={handleUpdateSession}
          onNavigateArtifact={(type, data) => { 
            setActiveTab(type); 
            if (type === 'quiz') setState(prev => ({ ...prev, currentQuiz: { ...data, results: state.quizResults[data.id] } }));
            if (type === 'mindmap') setState(prev => ({ ...prev, currentMindMap: data })); 
            setIsPanelOpen(true); 
          }}
        />
        
        {isPanelOpen && <div className="w-1.5 cursor-col-resize resizer hover:bg-blue-500 transition-all z-50 flex-shrink-0" onMouseDown={handleMouseDown} />}

        <RightPanel 
          isOpen={isPanelOpen} width={panelWidth}
          activeTab={activeTab} setActiveTab={setActiveTab}
          quiz={state.currentQuiz} mindMap={state.currentMindMap}
          allQuizzes={artifacts.quizzes} allMindMaps={artifacts.mindMaps}
          knowledgeBase={state.knowledgeBase} weakPoints={state.weakPoints}
          onSelectArtifact={(type, data) => {
            if (type === 'quiz') setState(prev => ({ ...prev, currentQuiz: { ...data, results: state.quizResults[data.id] } }));
            if (type === 'mindmap') setState(prev => ({ ...prev, currentMindMap: data }));
          }}
          onQuizComplete={(f) => handleSendMessage(f)}
          onQuizSubmit={handleQuizSubmit}
          onUpdateKnowledge={(c) => setState(prev => ({ ...prev, knowledgeBase: [{ id: Date.now().toString(), content: c, timestamp: Date.now() }, ...prev.knowledgeBase] }))}
          onRemoveKnowledge={(id) => setState(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.filter(b => b.id !== id) }))}
          onRemoveWeakness={(id) => setState(prev => ({ ...prev, weakPoints: prev.weakPoints.filter(b => b.id !== id) }))}
          onAcceptWeakness={(id) => setState(prev => ({ ...prev, weakPoints: prev.weakPoints.map(b => b.id === id ? { ...b, status: 'accepted' as const } : b) }))}
        />
      </main>

      {isSettingsOpen && <SettingsDialog configs={state.configs} activeId={state.activeConfigId} mcpTools={state.mcpTools} totalTokens={state.totalTokensUsed} onSave={(c, a, m) => setState(prev => ({...prev, configs: c, activeConfigId: a, mcpTools: m}))} onClose={() => setIsSettingsOpen(false)} />}
      {needsApiKey && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-3xl">
          <div className="bg-[#1C1C1E] rounded-[32px] p-12 max-w-md w-full text-center border border-white/10 shadow-2xl space-y-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">需要密钥授权</h2>
            <p className="text-[#86868B] text-sm">为了开启 AI 服务，请配置您的 API Key</p>
            <button onClick={handleOpenSelectKey} className="w-full py-4 bg-[#0A84FF] text-white rounded-[16px] font-bold shadow-xl hover:bg-blue-600 transition-all">立即配置</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
