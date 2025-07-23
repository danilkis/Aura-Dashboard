export type View = 'dashboard' | 'home' | 'mail' | 'settings';

export interface Todo {
  id: number; // bigint → number
  created_at: string; // timestamp with time zone → string (ISO формат)
  content: string; // text → string
  done: boolean; // boolean → boolean
}


export interface Email {
  id: number;
  created_at: string;
  sender: string;
  subject: string;
  snippet: string;
  read: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  audio?: {
    blob: Blob;
    waveform: number[];
  };
}

export type CustomWidgetType = 'gemini' | 'smarthome';

export interface CustomWidgetConfig {
  type: CustomWidgetType;
  title: string;
  // For 'gemini' type
  prompt?: string;
  // For 'smarthome' type
  device?: 'light' | 'speaker';
}

export interface ToolCall {
    name: 'device_control' | 'dashboard_control' | 'todo_control' | 'mail_control' | 'widget_refine' | 'weather' | 'calendar' | 'add_todo' | 'unknown' | 'read_todos' | 'read_emails' | 'add_widget' | 'remove_widget' | 'reset_widget_styles';
    args: Record<string, any>;
}

export interface AssistantResponse {
  displayText: string;
  toolCalls?: ToolCall[];
  language?: 'en-US' | 'ru-RU';
  errorType?: 'quota_exceeded';
}
