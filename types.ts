
export enum AIProvider {
  GEMINI = 'gemini',
  CUSTOM = 'custom'
}

export interface KBBlock {
  id: string;
  content: string;
  timestamp: number;
  tags?: string[];
}

export interface WPBlock {
  id: string;
  content: string;
  timestamp: number;
  status: 'suggested' | 'accepted';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  customPrompt?: string;
  settings: {
    useKnowledgeBase: boolean;
    useWeakPoints: boolean;
    useMCP: boolean;
  };
}

export interface AppState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  configs: AIConfig[];
  activeConfigId: string;
  currentQuiz: QuizData | null;
  currentMindMap: MindMapNode | null;
  knowledgeBase: KBBlock[]; 
  weakPoints: WPBlock[];     
  mcpTools: MCPTool[];
  totalTokensUsed: number;
  quizResults: Record<string, QuizData['results']>; // Added for persistent results
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  files?: FileData[];
}

export interface AIConfig {
  id: string;
  name: string;
  provider: AIProvider;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  apiKey?: string;
  useSearch?: boolean;
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
  results?: {
    userAnswers: Record<number, any>;
    submitted: boolean;
    score?: number;
  };
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  description?: string;
}

export interface FileData {
  mimeType: string;
  data: string;
  fileName: string;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'built_in' | 'custom';
  endpoint?: string;
}
