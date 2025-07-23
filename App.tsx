import React, { useState, useMemo, useCallback, CSSProperties, useEffect, useRef } from 'react';
import { View, Todo, ToolCall, Email, ChatMessage, AssistantResponse, CustomWidgetConfig } from './types';
import Sidebar from './components/Sidebar';
import DeviceControlView from './components/HomeControls';
import MailSummary from './components/MailSummary';
import AssistantView from './components/AssistantView';
import McpServer from './mcpServer';
import DashboardView from './DashboardView';
import Onboarding from './Onboarding';
import SettingsView from './components/SettingsView';
import { getAssistantResponse } from './services/geminiService';
import { useTodoStore } from './stores/todoStore'
import { fetchTodos } from './services/todoService';
import { useMailStore } from './stores/mailStore';

interface ISharedStorage {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
}

// Polyfill for sharedStorage using localStorage to ensure app works in standard browser environments
const sharedStorage: ISharedStorage = (typeof (window as any).sharedStorage !== 'undefined')
    ? (window as any).sharedStorage
    : {
        async get<T>(key: string): Promise<T | null> {
            try {
                const item = window.localStorage.getItem(key);
                if (item === null || item === 'undefined') {
                    if (item === 'undefined') window.localStorage.removeItem(key);
                    return null;
                }
                return JSON.parse(item) as T;
            } catch (error) {
                console.error(`Error getting item "${key}" from localStorage. Removing item.`, error);
                window.localStorage.removeItem(key);
                return null;
            }
        },
        async set<T>(key: string, value: T): Promise<void> {
            try {
                if (value === undefined || value === null) {
                    window.localStorage.removeItem(key);
                } else {
                    const jsonValue = JSON.stringify(value);
                    window.localStorage.setItem(key, jsonValue);
                }
            } catch (error) {
                console.error(`Error setting item "${key}" in localStorage:`, error);
            }
        }
    };

type Widget = 'clock' | 'weather' | 'mail' | 'todo';
type WidgetMap = {
    [key in 'a1' | 'a2' | 'a3' | 'b1']: Widget;
};

// --- Helper Functions ---
const getLuminance = (hex: string): number => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
};

const speak = (text: string, lang: string = 'en-US'): Promise<void> => {
    return new Promise((resolve) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Cancel any previous speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 1.05;
            const voices = window.speechSynthesis.getVoices();
            utterance.voice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0])) || null;
            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                console.error("Speech Synthesis Error:", e);
                resolve(); // Resolve even on error to not block the flow
            };
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Browser does not support Speech Synthesis.");
            resolve();
        }
    });
};


const generateWaveform = async (blob: Blob): Promise<number[]> => {
    if (!window.AudioContext) {
      return [];
    }
    try {
        const audioContext = new AudioContext();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const data = audioBuffer.getChannelData(0);
        const samples = 100; // Number of bars in the waveform
        const blockSize = Math.floor(data.length / samples);
        const waveform = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(data[blockStart + j]);
            }
            waveform.push(sum / blockSize);
        }
        const max = Math.max(...waveform);
        return waveform.map(x => x / max);
    } catch (error) {
        console.error("Error generating waveform:", error);
    };
        return [];
    }
;


// Preload voices
if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}


const App: React.FC = () => {
    const { todos, setTodos, addTodo, toggleTodo, deleteTodo } = useTodoStore(); // добавлено setTodos для загрузки из БД

    useEffect(() => {
        // При монтировании получаем список из Supabase и выставляем в стор
        fetchTodos().then(data => {
            if (data) {
                setTodos(data); // загружаем все todo в стор
            }
        }).catch(err => console.error('[App] fetchTodos error:', err));
    }, [setTodos]); // зависимость setTodos


    const [isOnboarding, setIsOnboarding] = useState(true);
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
    const [accentColor, setAccentColor] = useState<string>('#EC4899');
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [modelName, setModelName] = useState<string>('gemini-2.5-flash');
    const [imageGenerationEnabled, setImageGenerationEnabled] = useState<boolean>(false);
    const { emails, loadEmails, markAsRead, deleteEmail } = useMailStore();
    const [lightOn, setLightOn] = useState(true);
    const [speakerPlaying, setSpeakerPlaying] = useState(true);
    const [widgetMap, setWidgetMap] = useState<WidgetMap>({ a1: 'clock', a2: 'weather', a3: 'mail', b1: 'todo' });
    const [widgetStyles, setWidgetStyles] = useState<Record<Widget, CSSProperties>>({ clock: {}, weather: {}, mail: {}, todo: {} });
    const [customWidgets, setCustomWidgets] = useState<CustomWidgetConfig[]>([]);
    const [isAssistantOpen, setAssistantOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'Hi! I\'m Dashy. How can I help you today?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isVoiceQuery, setIsVoiceQuery] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // Load state from sharedStorage on initial render
    useEffect(() => {
        const loadState = async () => {
            try {
                const [
                    hasOnboarded, bgUrl, accent, savedTheme, model, imageGen,
                    savedTodos, savedEmails, light, speaker, map, styles, widgets, msgs, savedView
                ] = await Promise.all([
                    sharedStorage.get<boolean>('aura-hasOnboarded'),
                    sharedStorage.get<string>('aura-backgroundUrl'),
                    sharedStorage.get<string>('aura-accentColor'),
                    sharedStorage.get<'light' | 'dark'>('aura-theme'),
                    sharedStorage.get<string>('aura-modelName'),
                    sharedStorage.get<boolean>('aura-imageGenerationEnabled'),
                    sharedStorage.get<Todo[]>('aura-todos'),
                    sharedStorage.get<Email[]>('aura-emails'),
                    sharedStorage.get<boolean>('aura-lightOn'),
                    sharedStorage.get<boolean>('aura-speakerPlaying'),
                    sharedStorage.get<WidgetMap>('aura-widgetMap'),
                    sharedStorage.get<Record<Widget, CSSProperties>>('aura-widgetStyles'),
                    sharedStorage.get<CustomWidgetConfig[]>('aura-customWidgets'),
                    sharedStorage.get<ChatMessage[]>('aura-messages'),
                    sharedStorage.get<View>('aura-activeView'),
                ]);

                if (hasOnboarded) setIsOnboarding(false);
                if (bgUrl) setBackgroundUrl(bgUrl);
                if (accent) setAccentColor(accent);
                if (savedTheme) setTheme(savedTheme);
                if (model) setModelName(model);
                if (typeof imageGen === 'boolean') setImageGenerationEnabled(imageGen);
                if (typeof light === 'boolean') setLightOn(light);
                if (typeof speaker === 'boolean') setSpeakerPlaying(speaker);
                if (map) setWidgetMap(map);
                if (styles) setWidgetStyles(styles);
                if (widgets) setCustomWidgets(widgets);
                if (msgs && msgs.length > 0) setMessages(msgs);
                if (savedView) setActiveView(savedView);

            } catch (error) {
                console.error("Failed to load state from sharedStorage:", error);
            }
        };
        loadState();
    }, []);
 useEffect(() => {
    loadEmails().catch(err => console.error('[App] loadEmails error:', err));
}, [loadEmails]);

    // Save states to sharedStorage on change
    useEffect(() => { sharedStorage.set('aura-activeView', activeView).catch(e => console.error(e)); }, [activeView]);
    useEffect(() => { sharedStorage.set('aura-backgroundUrl', backgroundUrl).catch(e => console.error(e)); }, [backgroundUrl]);
    useEffect(() => { sharedStorage.set('aura-accentColor', accentColor).catch(e => console.error(e)); }, [accentColor]);
    useEffect(() => { sharedStorage.set('aura-theme', theme).catch(e => console.error(e)); }, [theme]);
    useEffect(() => { sharedStorage.set('aura-modelName', modelName).catch(e => console.error(e)); }, [modelName]);
    useEffect(() => { sharedStorage.set('aura-imageGenerationEnabled', imageGenerationEnabled).catch(e => console.error(e)); }, [imageGenerationEnabled]);
    useEffect(() => { sharedStorage.set('aura-todos', todos).catch(e => console.error(e)); }, [todos]);
    useEffect(() => { sharedStorage.set('aura-lightOn', lightOn).catch(e => console.error(e)); }, [lightOn]);
    useEffect(() => { sharedStorage.set('aura-speakerPlaying', speakerPlaying).catch(e => console.error(e)); }, [speakerPlaying]);
    useEffect(() => { sharedStorage.set('aura-widgetMap', widgetMap).catch(e => console.error(e)); }, [widgetMap]);
    useEffect(() => { sharedStorage.set('aura-widgetStyles', widgetStyles).catch(e => console.error(e)); }, [widgetStyles]);
    useEffect(() => { sharedStorage.set('aura-customWidgets', customWidgets).catch(e => console.error(e)); }, [customWidgets]);
    useEffect(() => { if (messages.length > 1) { sharedStorage.set('aura-messages', messages).catch(e => console.error(e)); } }, [messages]);

    const handleBackgroundGenerated = useCallback((data: { backgroundUrl: string; accentColor: string; errorType?: 'quota_exceeded' }) => {
        if (isOnboarding) {
            setTimeout(() => {
                setIsOnboarding(false);
                sharedStorage.set('aura-hasOnboarded', true).catch(e => console.error("Failed to save onboarding state:", e));
            }, 500);
        }
        setBackgroundUrl(data.backgroundUrl);
        setAccentColor(data.accentColor);
        setTheme(getLuminance(data.accentColor) > 128 ? 'dark' : 'light');
    }, [isOnboarding]);

    const handleAddTodo = useCallback((tasks: string[]) => {
        tasks.forEach(task => addTodo(task));
    }, [addTodo]);



    const handleTodoControl = useCallback((action: 'complete' | 'delete', tasks: string[]) => {
    const normalizedTasks = tasks.map(t => t.toLowerCase().trim());
    todos.forEach(todo => {
        const match = normalizedTasks.some(nt => todo.content.toLowerCase().includes(nt));
        if (match) {
            if (action === 'complete') toggleTodo(todo.id);
            if (action === 'delete') deleteTodo(todo.id);
        }
    });
}, [todos, toggleTodo, deleteTodo]);

    
    const handleMailControl = useCallback((action: 'read' | 'delete' | 'read_all', emailCriteria?: { sender: string, subject?: string }[]) => {
    if (action === 'read_all') {
        emails.forEach(email => {
            if (!email.read) markAsRead(email.id);
        });
        return;
    }
    if (!emailCriteria || emailCriteria.length === 0) return;

    emails.forEach(email => {
        const match = emailCriteria.some(crit =>
            email.sender.toLowerCase().includes(crit.sender.toLowerCase()) &&
            (!crit.subject || email.subject.toLowerCase().includes(crit.subject.toLowerCase()))
        );

        if (match) {
            if (action === 'read' && !email.read) markAsRead(email.id);
            if (action === 'delete') deleteEmail(email.id);
        }
    });
}, [emails, markAsRead, deleteEmail]);


    const handleDashboardControl = useCallback((action: 'swap', widgetA: Widget, widgetB: Widget) => {
        if (action === 'swap') {
            setWidgetMap(prev => {
                const newMap = { ...prev };
                let keyA: keyof WidgetMap | null = null;
                let keyB: keyof WidgetMap | null = null;
                for (const key in newMap) {
                    if (newMap[key as keyof WidgetMap] === widgetA) keyA = key as keyof WidgetMap;
                    if (newMap[key as keyof WidgetMap] === widgetB) keyB = key as keyof WidgetMap;
                }
                if (keyA && keyB) {
                    [newMap[keyA], newMap[keyB]] = [newMap[keyB], newMap[keyA]];
                }
                return newMap;
            });
        }
    }, []);

    const handleWidgetRefine = useCallback((widgetName: Widget, cssProps: CSSProperties) => {
        setWidgetStyles(prev => ({ ...prev, [widgetName]: { ...prev[widgetName], ...cssProps } }));
    }, []);

    const handleResetWidgetStyles = useCallback(() => {
        setWidgetStyles({ clock: {}, weather: {}, mail: {}, todo: {} });
    }, []);

    const handleAddWidget = useCallback((config: CustomWidgetConfig) => {
        setCustomWidgets(prev => [...prev, config]);
    }, []);

    const handleRemoveWidgetByTitle = useCallback((title: string) => {
        setCustomWidgets(prev => prev.filter(w => w.title !== title));
    }, []);

    const getEmails = useCallback(() => emails, [emails]);
    const getTodos = useCallback(() => todos, [todos]);
    const mcpServer = useMemo(() => new McpServer({
        addTodo: handleAddTodo, todoControl: handleTodoControl, mailControl: handleMailControl,
        dashboardControl: handleDashboardControl, widgetRefine: handleWidgetRefine,
        setLightState: setLightOn, setSpeakerState: setSpeakerPlaying, getTodos, getEmails,
        resetWidgetStyles: handleResetWidgetStyles, addWidget: handleAddWidget, removeWidget: handleRemoveWidgetByTitle,
    }), [handleAddTodo, handleTodoControl, handleMailControl, handleDashboardControl, handleWidgetRefine, getTodos, getEmails, handleResetWidgetStyles, handleAddWidget, handleRemoveWidgetByTitle]);

    const processConversation = useCallback(async (currentHistory: ChatMessage[], audio?: { base64: string; mimeType: string }) => {
        setIsLoading(true);
        setApiError(null);
    
        const modelToUse = audio ? 'gemini-2.5-flash' : modelName;
        const response = await getAssistantResponse(currentHistory, modelToUse, audio);
    
        setIsLoading(false);
    
        if (response.errorType === 'quota_exceeded' || response.displayText.includes('not available')) {
            setApiError(response.displayText);
            return;
        }
    
        const modelMessage: ChatMessage = { role: 'model', text: response.displayText };
        const historyWithModelResponse = [...currentHistory, modelMessage];
        setMessages(historyWithModelResponse);
    
        if (response.toolCalls && response.toolCalls.length > 0) {
            let historyForNextTurn = historyWithModelResponse;
            for (const call of response.toolCalls) {
                try {
                    const result = await mcpServer.processToolCall(call.name, call.args, response.language);
                    console.log("MCP Result:", result.logMessage);
                    if (result.followUpPrompt) {
                        const followUpMessage: ChatMessage = { role: 'user', text: result.followUpPrompt };
                        historyForNextTurn = [...historyForNextTurn, followUpMessage];
                    }
                } catch (error) {
                    console.error("MCP Error:", error);
                    // Optionally add an error message to the chat
                }
            }
            
            // If there were any follow-up prompts, continue the conversation recursively.
            if (historyForNextTurn.length > historyWithModelResponse.length) {
                await processConversation(historyForNextTurn);
            } else {
                // No follow-up prompts, the turn is over. Speak if it was a voice query.
                if (isVoiceQuery) {
                    await speak(response.displayText, response.language);
                }
            }
        } else {
            // No tool calls, conversation turn ends. Speak if it was a voice query.
            if (isVoiceQuery) {
                await speak(response.displayText, response.language);
            }
        }
    }, [mcpServer, modelName, isVoiceQuery]);

    const submitQuery = async (userMessage: ChatMessage, isVoice: boolean, audio?: { base64: string; mimeType: string }) => {
        setIsVoiceQuery(isVoice);
        const historyWithNewMessage: ChatMessage[] = [...messages, userMessage];
        setMessages(historyWithNewMessage);
        setInput('');
        
        await processConversation(historyWithNewMessage, audio);
    };
    
    const handleTextSend = () => {
        if (input.trim() === '' || isLoading) return;
        const userMessage: ChatMessage = { role: 'user', text: input };
        submitQuery(userMessage, false);
    };
    
    const handleAudioSend = async (blob: Blob, waveform: number[]) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            const userMessage: ChatMessage = { role: 'user', text: '(Voice message)', audio: { blob, waveform } };
            submitQuery(userMessage, true, { base64: base64String, mimeType: blob.type });
        };
    };

    const handleMicClick = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isAssistantOpen) setAssistantOpen(true);
            
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const waveform = await generateWaveform(audioBlob);
                handleAudioSend(audioBlob, waveform);
                stream.getTracks().forEach(track => track.stop());
            };
            
            recorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setApiError("Microphone access denied. Please check browser permissions.");
            if (!isAssistantOpen) setAssistantOpen(true);
        }
    };
    
    // Don't render the main app until background is loaded or generated, to avoid flash
    const shouldRenderApp = !isOnboarding && backgroundUrl;

    if (!shouldRenderApp) {
        return (
            <>
                <Onboarding />
                {/* Render dashboard hidden to trigger background generation */}
                <div style={{ display: 'none' }}>
                     <DashboardView 
                        widgetMap={widgetMap} widgetStyles={widgetStyles} todos={todos} emails={emails}
                        onToggleTodo={(id) => {}} onDeleteTodo={(id) => {}} onUpdateMail={(id, read) => {}}
                        onBackgroundGenerated={handleBackgroundGenerated} modelName={modelName} imageGenerationEnabled={imageGenerationEnabled}
                        customWidgets={customWidgets} onRemoveWidget={handleRemoveWidgetByTitle}
                        lightOn={lightOn} setLightOn={setLightOn} speakerPlaying={speakerPlaying} setSpeakerPlaying={setSpeakerPlaying}
                    />
                </div>
            </>
        );
    }
    
    const cssVars = `
      :root {
        --accent-color: ${accentColor};
        --primary-text-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(25, 25, 25, 0.9)'};
        --secondary-text-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(25, 25, 25, 0.6)'};
        --card-bg: ${theme === 'light' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)'};
        --card-border-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)'};
        --bg-hover-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'};
        --input-bg-color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)'};
        --input-placeholder-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'};
        --card-shadow-color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.2)'};
        --danger-color: #ef4444;
      }
      .card-style {
        background: var(--card-bg); border: 1px solid var(--card-border-color); border-radius: 1.25rem;
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 12px 28px 0 var(--card-shadow-color);
        transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
      }
    `;

    return (
        <>
            <style>{cssVars}</style>
            <main className="h-screen w-screen flex" style={{ backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'background-image 1s ease-in-out' }}>
                <Sidebar activeView={activeView} setActiveView={setActiveView} />
                <div className="flex-grow h-screen overflow-y-auto">
                    {activeView === 'dashboard' && <DashboardView {...{widgetMap, widgetStyles, todos, emails, customWidgets, onToggleTodo: (id) => handleTodoControl('complete', [todos.find(t => t.id === id)?.content || '']), onDeleteTodo: (id) => handleTodoControl('delete', [todos.find(t => t.id === id)?.content || '']), onUpdateMail: (id, read) => { const email = emails.find(e => e.id === id); if (email) handleMailControl('read', [{sender: email.sender, subject: email.subject}]); }, onBackgroundGenerated: handleBackgroundGenerated, modelName, imageGenerationEnabled, onRemoveWidget: handleRemoveWidgetByTitle, lightOn, setLightOn, speakerPlaying, setSpeakerPlaying }} />}
                    {activeView === 'home' && <DeviceControlView {...{lightOn, setLightOn, speakerPlaying, setSpeakerPlaying}} />}
                    {activeView === 'mail' && <MailSummary {...{emails, onUpdate: (id, read) => { const email = emails.find(e => e.id === id); if(email) handleMailControl('read', [{sender: email.sender, subject: email.subject}]); }, onDelete: (id) => { const email = emails.find(e => e.id === id); if(email) handleMailControl('delete', [{sender: email.sender, subject: email.subject}]); }}} />}
                    {activeView === 'settings' && <SettingsView {...{modelName, setModelName, imageGenerationEnabled, setImageGenerationEnabled}} />}
                </div>
                <AssistantView {...{isOpen: isAssistantOpen, messages, input, isLoading, isRecording, apiError, setIsOpen: setAssistantOpen, setInput, setApiError, handleSend: handleTextSend, handleMicClick }} />
            </main>
        </>
    );
};

export default App;