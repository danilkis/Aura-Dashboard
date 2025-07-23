import { ToolCall, Email, Todo, AssistantResponse, CustomWidgetConfig } from './types';
import { CSSProperties } from 'react';

type Widget = 'clock' | 'weather' | 'mail' | 'todo';

interface McpServerHandlers {
    addTodo: (tasks: string[]) => void;
    todoControl: (action: 'complete' | 'delete', tasks: string[]) => void;
    mailControl: (action: 'read' | 'delete' | 'read_all', emailCriteria?: {sender: string, subject?: string}[]) => void;
    dashboardControl: (action: 'swap', widgetA: any, widgetB: any) => void;
    widgetRefine: (widgetName: Widget, cssProps: CSSProperties) => void;
    setLightState: (isOn: boolean) => void;
    setSpeakerState: (isPlaying: boolean) => void;
    getTodos: () => Todo[];
    getEmails: () => Email[];
    resetWidgetStyles: () => void;
    addWidget: (config: CustomWidgetConfig) => void;
    removeWidget: (title: string) => void;
}

interface McpResult {
    logMessage: string;
    followUpPrompt?: string;
}

class McpServer {
    private handlers: McpServerHandlers;

    constructor(handlers: McpServerHandlers) {
        this.handlers = handlers;
    }

    public async processToolCall(name: ToolCall['name'], args: Record<string, any>, lang: AssistantResponse['language'] = 'en-US'): Promise<McpResult> {
        console.log(`MCP Server processing: ${name}`, args);
        switch (name) {
            case 'add_todo':
                if (args.tasks && Array.isArray(args.tasks)) {
                    this.handlers.addTodo(args.tasks);
                    return { logMessage: `Successfully added ${args.tasks.length} task(s).` };
                }
                throw new Error('MCP Error: Missing or invalid "tasks" array for add_todo.');

            case 'todo_control':
                 if (args.action && (args.action === 'complete' || args.action === 'delete') && args.tasks && Array.isArray(args.tasks)) {
                    this.handlers.todoControl(args.action, args.tasks);
                    return { logMessage: `Successfully performed "${args.action}" on ${args.tasks.length} task(s).` };
                }
                throw new Error('MCP Error: Invalid args for todo_control.');
            
            case 'read_todos': {
                const status = args.status || 'incomplete';
                const allTodos = this.handlers.getTodos();
                const filteredTodos = allTodos.filter(t => {
                    if (status === 'all') return true;
                    if (status === 'completed') return t.completed;
                    if (status === 'incomplete') return !t.completed;
                    return false;
                });
    
                if (filteredTodos.length === 0) {
                    const followUpPrompt = lang === 'ru-RU' 
                        ? `Скажи пользователю, что у него нет ${status === 'completed' ? 'выполненных' : 'активных'} задач.`
                        : `Tell the user they have no ${status} to-do items.`;
                    return { logMessage: 'No todos to read.', followUpPrompt };
                }
    
                const todoList = filteredTodos.map(t => `- "${t.text}"`).join('\n');
                const followUpPrompt = `Read the following to-do items to the user in a friendly, conversational way, in language ${lang}:\n${todoList}`;
                return { logMessage: `Found ${filteredTodos.length} todos to read.`, followUpPrompt };
            }

            case 'read_emails': {
                const status = args.status || 'unread';
                const allEmails = this.handlers.getEmails();
                const filteredEmails = allEmails.filter(e => {
                     if (status === 'all') return true;
                     if (status === 'read') return e.read;
                     if (status === 'unread') return !e.read;
                     return false;
                });

                if (filteredEmails.length === 0) {
                     const followUpPrompt = lang === 'ru-RU'
                        ? `Скажи пользователю, что у него нет ${status === 'read' ? 'прочитанных' : 'непрочитанных'} писем.`
                        : `Tell the user there are no ${status} emails.`;
                     return { logMessage: `No ${status} emails to read.`, followUpPrompt };
                }
                const emailList = filteredEmails.map(e => `From ${e.sender}, subject: ${e.subject}, content: ${e.snippet}`).join('\n---\n');
                const followUpPrompt = `Summarize the following emails for the user in a friendly, conversational way. Be concise. Respond in language ${lang}:\n${emailList}`;
                return { logMessage: `Found ${filteredEmails.length} emails to read.`, followUpPrompt };
            }

            case 'mail_control':
                if (args.action === 'read_all') {
                    this.handlers.mailControl('read_all');
                    return { logMessage: `Successfully marked all emails as read.` };
                }
                if (args.action && (args.action === 'read' || args.action === 'delete') && args.emails && Array.isArray(args.emails)) {
                    this.handlers.mailControl(args.action, args.emails);
                    return { logMessage: `Successfully performed "${args.action}" on ${args.emails.length} email(s).` };
                }
                throw new Error('MCP Error: Invalid args for mail_control.');
            
            case 'dashboard_control':
                if (args.action === 'swap' && args.widget_a && args.widget_b) {
                    this.handlers.dashboardControl(args.action, args.widget_a.toLowerCase(), args.widget_b.toLowerCase());
                    return { logMessage: `Successfully swapped ${args.widget_a} and ${args.widget_b}.` };
                }
                throw new Error('MCP Error: Invalid args for dashboard_control.');

            case 'widget_refine':
                if (args.widget_name && args.css_props && typeof args.css_props === 'object') {
                    this.handlers.widgetRefine(args.widget_name.toLowerCase(), args.css_props);
                    return { logMessage: `Successfully refined ${args.widget_name}.` };
                }
                throw new Error('MCP Error: Invalid args for widget_refine.');
                
            case 'device_control':
                if (args.device_name && typeof args.device_name === 'string' && args.state && typeof args.state === 'string') {
                    const device = args.device_name.toLowerCase();
                    const state = args.state.toLowerCase();
                    
                    if (device.includes('light')) {
                        const isOn = state === 'on';
                        this.handlers.setLightState(isOn);
                        return { logMessage: `Overhead light is now ${isOn ? 'On' : 'Off'}.` };
                    } else if (device.includes('speaker')) {
                        const isPlaying = state === 'on' || state === 'playing';
                        this.handlers.setSpeakerState(isPlaying);
                        return { logMessage: `Kitchen speaker is now ${isPlaying ? 'Playing' : 'Paused'}.` };
                    }
                    throw new Error(`MCP Error: Unknown device "${args.device_name}".`);
                }
                throw new Error('MCP Error: Missing or invalid arguments for device_control.');

            case 'reset_widget_styles':
                this.handlers.resetWidgetStyles();
                return { logMessage: `Successfully reset all widget styles.` };
    
            case 'add_widget':
                if (args.type && args.title && args.config) {
                    this.handlers.addWidget({ type: args.type, title: args.title, ...args.config });
                    return { logMessage: `Successfully added widget "${args.title}".` };
                }
                throw new Error('MCP Error: Invalid args for add_widget.');
    
            case 'remove_widget':
                if (args.title) {
                    this.handlers.removeWidget(args.title);
                    return { logMessage: `Successfully removed widget "${args.title}".` };
                }
                throw new Error('MCP Error: Invalid args for remove_widget.');

            default:
                console.warn(`MCP Warning: Unhandled tool call "${name}"`);
                return { logMessage: `Tool "${name}" is not handled by this MCP server.` };
        }
    }
}

export default McpServer;
