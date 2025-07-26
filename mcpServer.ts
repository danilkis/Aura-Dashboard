// mcpServer.ts — clean compile‑friendly MCP stub
// ----------------------------------------------------------------------------------
// This version fixes the TS errors you hit:
//  1) avoids missing exports (ToolExecutionContext / MemoryServerTransport)
//  2) feeds registerTool a ZodRawShape (SDK expects object literal, not ZodObject)
//  3) provides a tiny fallback `callTool` so React code keeps working even if
//     the SDK doesn’t expose one directly.
// Replace the earlier file with this and run `tsc` — it should compile.
// ----------------------------------------------------------------------------------

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Fallback transport for browser environments
// @ts-ignore — MemoryServerTransport types are not exported yet
// Transport for browser/SSE environments
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { CSSProperties } from 'react';
import { ToolCall, AssistantResponse, Email, Todo, CustomWidgetConfig } from './types';
// Zustand stores
import { useTodoStore } from './stores/todoStore';
import { useMailStore } from './stores/mailStore';

// Debug flag – set NODE_ENV=production to silence extra logs
const DEBUG =
  (typeof process !== 'undefined' && process?.env?.NODE_ENV)
    ? process.env.NODE_ENV !== 'production'
    : true;

let initialized = false;
// Store handlers so callTool can fall back to them
let registeredHandlers: McpHandlers | null = null;

type Infer<T extends z.ZodTypeAny> = z.infer<T>;


export type Widget = 'clock' | 'weather' | 'mail' | 'todo';

/**
 * Legacy result shape expected by older callers.
 */
export interface McpResult {
  logMessage: string;
  followUpPrompt?: string;
}

export interface McpHandlers {
  addTodo: (tasks: string[]) => void;
  todoControl: (action: 'complete' | 'delete', tasks: string[]) => void;
  mailControl: (
    action: 'read' | 'delete' | 'read_all',
    emailCriteria?: { sender: string; subject?: string }[]
  ) => void;
  dashboardControl: (action: 'swap', widgetA: Widget, widgetB: Widget) => void;
  widgetRefine: (widgetName: Widget, cssProps: CSSProperties) => void;
  setLightState: (isOn: boolean) => void;
  setSpeakerState: (isPlaying: boolean) => void;
  getTodos: () => Todo[];
  getEmails: () => Email[];
  resetWidgetStyles: () => void;
  addWidget: (config: CustomWidgetConfig) => void;
  removeWidget: (title: string) => void;
}

/* ---------------------------------------------------------------------------
   Server & transport
--------------------------------------------------------------------------- */
const server = new McpServer({ name: 'dashy-backend', version: '1.0.0' });
// -----------------------------------------------------------------------
// Polyfill: map server.callTool → server.executeTool when missing.
// Newer @modelcontextprotocol SDKs renamed the method, but rest of the
// codebase (and external callers) still expect callTool().  Bridging here
// avoids fallback spam and keeps a single execution path.
// -----------------------------------------------------------------------
if (typeof (server as any).callTool !== 'function' &&
    typeof (server as any).executeTool === 'function') {
  (server as any).callTool = async (name: string, args: Record<string, unknown>) => {
    return (server as any).executeTool(name, args);
  };
}
// Choose a transport appropriate for the runtime:
// • In Node (process.stdin exists) we keep stdio.
// • In the browser/SSE we use a streamable HTTP transport.
const transport =
  (typeof window === 'undefined' && typeof process !== 'undefined' && process.stdin)
    ? new StdioServerTransport()
    : new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

// Expose a stable endpoint identifier for clients.
export const MCP_ENDPOINT =
  (transport instanceof StdioServerTransport)
    ? 'stdio://dashy-backend'
    : 'http://localhost:3000/mcp';

/* ---------------------------------------------------------------------------
   Tool registration helper (so schema+shape synced)
--------------------------------------------------------------------------- */
function makeTool<S extends z.ZodRawShape>(shape: S) {
  const schema = z.object(shape);
  return { shape, schema } as const;
}

/* ---------------------------------------------------------------------------
   Public init — call once from App.tsx
--------------------------------------------------------------------------- */
export async function initMcp(h: McpHandlers): Promise<void> {
  if (initialized) return;
  console.log('[mcpServer] initMcp started');
  registeredHandlers = h;
  if (DEBUG) console.debug('[mcpServer] initMcp → handler registration started');
  /* add_todo */
  const addTodo = makeTool({ tasks: z.array(z.string().min(1)) });
  server.registerTool('add_todo', { title: 'Add todo(s)', inputSchema: addTodo.shape }, async ({ tasks }: Infer<typeof addTodo.schema>) => {
    h.addTodo(tasks);
    return txt(`✅ Added ${tasks.length} task(s).`);
  });

  /* todo_control */
  const todoCtl = makeTool({ action: z.enum(['complete', 'delete']), tasks: z.array(z.string().min(1)) });
  server.registerTool('todo_control', { title: 'Control todos', inputSchema: todoCtl.shape }, async ({ action, tasks }: Infer<typeof todoCtl.schema>) => {
    h.todoControl(action, tasks);
    return txt(`🔄 ${action} → ${tasks.length}`);
  });

  /* read_todos */
  const readTodos = makeTool({ status: z.enum(['all', 'completed', 'incomplete']).default('incomplete') });
  server.registerTool('read_todos', { title: 'Read todos', inputSchema: readTodos.shape }, async ({ status }: Infer<typeof readTodos.schema>) => {
    const list = h.getTodos();
    const filtered = list.filter(t => (status === 'all') || (status === 'completed' ? t.done : !t.done));
    if (!filtered.length) return txt(`📭 No ${status} todos.`);
    return txt(filtered.map(t => `• ${t.done ? '✅' : '▢'} ${t.content}`).join('\n'));
  });

  /* mail_control */
  const mailCtlShape = makeTool({
    action: z.literal('read_all').or(z.enum(['read', 'delete'])),
    emails: z.array(z.object({ sender: z.string(), subject: z.string().optional() })).optional(),
  });
  server.registerTool('mail_control', { title: 'Control mail', inputSchema: mailCtlShape.shape }, async (args: any) => {
    if (args.action === 'read_all') h.mailControl('read_all');
    else h.mailControl(args.action, args.emails);
    return txt(`✉️ ${args.action} done.`);
  });

  /* read_emails */
  const readEmails = makeTool({ status: z.enum(['all', 'read', 'unread']).default('unread') });
  server.registerTool('read_emails', { title: 'Read emails', inputSchema: readEmails.shape }, async ({ status }: Infer<typeof readEmails.schema>) => {
    const emails = h.getEmails();
    const filtered = emails.filter(e => (status === 'all') || (status === 'read' ? e.read : !e.read));
    if (!filtered.length) return txt(`📭 No ${status} mail.`);
    return txt(filtered.map(e => `• ${e.sender}: ${e.subject}`).join('\n'));
  });

  /* dashboard_control */
  const dash = makeTool({ action: z.literal('swap'), widget_a: z.enum(['clock', 'weather', 'mail', 'todo']), widget_b: z.enum(['clock', 'weather', 'mail', 'todo']) });
  server.registerTool('dashboard_control', { title: 'Swap widgets', inputSchema: dash.shape }, async ({ widget_a, widget_b }: Infer<typeof dash.schema>) => {
    h.dashboardControl('swap', widget_a, widget_b);
    return txt(`🎛️ swapped ${widget_a} ↔ ${widget_b}`);
  });

  /* widget_refine */
  const refine = makeTool({ widget_name: z.enum(['clock', 'weather', 'mail', 'todo']), css_props: z.record(z.string()) });
  server.registerTool('widget_refine', { title: 'Refine widget', inputSchema: refine.shape }, async ({ widget_name, css_props }: Infer<typeof refine.schema>) => {
    h.widgetRefine(widget_name, css_props as CSSProperties);
    return txt('🎨 style updated');
  });

  /* device_control */
  const device = makeTool({ device_name: z.string(), state: z.enum(['on', 'off', 'playing', 'paused']) });
  server.registerTool('device_control', { title: 'Device control', inputSchema: device.shape }, async ({ device_name, state }: Infer<typeof device.schema>) => {
    const n = device_name.toLowerCase();
    if (n.includes('light')) h.setLightState(state === 'on');
    else if (n.includes('speaker')) h.setSpeakerState(state === 'on' || state === 'playing');
    else return txt(`❓ unknown device ${device_name}`);
    return txt(`🔌 ${device_name} → ${state}`);
  });

  /* reset_widget_styles */
  server.registerTool('reset_widget_styles', { title: 'Reset styles', inputSchema: {} }, async () => {
    h.resetWidgetStyles();
    return txt('♻️ styles reset');
  });

  /* add_widget */
  const addWidget = makeTool({ type: z.enum(['gemini', 'smarthome']), title: z.string(), config: z.record(z.any()) });
  server.registerTool('add_widget', { title: 'Add widget', inputSchema: addWidget.shape }, async ({ type, title, config }: Infer<typeof addWidget.schema>) => {
    h.addWidget({ type, title, ...config } as CustomWidgetConfig);
    return txt(`➕ ${title}`);
  });

  /* remove_widget */
  const removeWidget = makeTool({ title: z.string() });
  server.registerTool('remove_widget', { title: 'Remove widget', inputSchema: removeWidget.shape }, async ({ title }: Infer<typeof removeWidget.schema>) => {
    h.removeWidget(title);
    return txt(`➖ ${title}`);
  });
  await server.connect(transport);
  if (DEBUG) {
    console.debug(`[mcpServer] MCP server connected via ${MCP_ENDPOINT}`);
    if (typeof (server as any).listTools === 'function') {
      try {
        const tools = await (server as any).listTools();
        console.debug('[mcpServer] Tools currently exposed:', tools.map((t: any) => t.name ?? t).join(', '));
      } catch (err) {
        console.error('[mcpServer] Failed to list tools:', err);
      }
    }
  }
  initialized = true;
}

/**
 * Legacy compatibility helper – mirrors the behaviour of the original
 * McpServer.processToolCall() so existing callers keep working. It re‑uses the
 * handlers registered via initMcp() and returns the familiar
 * { logMessage, followUpPrompt } object.
 */
export async function processToolCall(
  name: ToolCall['name'],
  args: Record<string, any>,
  lang: AssistantResponse['language'] = 'en-US'
): Promise<McpResult> {
  if (DEBUG) console.debug('[mcpServer] processToolCall invoked:', name, args);
  if (!registeredHandlers) {
    throw new Error('[mcpServer] MCP not initialized — call initMcp() first.');
  }

  const h = registeredHandlers;

  // Helper to cope with both `.done` (new) and `.completed` (old) todo flags
  const isCompleted = (t: any): boolean =>
    typeof t.done === 'boolean' ? t.done : !!t.completed;

  switch (name) {
    /* ----------------------- Todos ------------------------------------ */
    case 'add_todo':
      if (args.tasks && Array.isArray(args.tasks)) {
        h.addTodo(args.tasks);
        return { logMessage: `Successfully added ${args.tasks.length} task(s).` };
      }
      throw new Error('MCP Error: Missing or invalid "tasks" array for add_todo.');

    case 'todo_control':
      if (args.action && (args.action === 'complete' || args.action === 'delete') &&
          args.tasks && Array.isArray(args.tasks)) {
        h.todoControl(args.action, args.tasks);
        return {
          logMessage: `Successfully performed "${args.action}" on ${args.tasks.length} task(s).`
        };
      }
      throw new Error('MCP Error: Invalid args for todo_control.');

    case 'read_todos': {
      const status = args.status ?? 'incomplete';
      const all = h.getTodos();
      const filtered = all.filter((t) => {
        if (status === 'all')        return true;
        if (status === 'completed')  return isCompleted(t);
        if (status === 'incomplete') return !isCompleted(t);
        return false;
      });

      if (!filtered.length) {
        const followUpPrompt = lang === 'ru-RU'
          ? `Скажи пользователю, что у него нет ${status === 'completed' ? 'выполненных' : 'активных'} задач.`
          : `Tell the user they have no ${status} to‑do items.`;
        return { logMessage: 'No todos to read.', followUpPrompt };
      }

      const todoList = filtered.map((t: any) =>
        `- "${t.content ?? t.text}"`).join('\n');
      const followUpPrompt =
        `Read the following to‑do items to the user in a friendly, conversational way, in language ${lang}:\n${todoList}`;
      return { logMessage: `Found ${filtered.length} todos to read.`, followUpPrompt };
    }

    /* ----------------------- Mail ------------------------------------- */
    case 'read_emails': {
      const status = args.status ?? 'unread';
      const all = h.getEmails();
      const filtered = all.filter((e: any) => {
        if (status === 'all')   return true;
        if (status === 'read')  return e.read;
        if (status === 'unread')return !e.read;
        return false;
      });

      if (!filtered.length) {
        const followUpPrompt = lang === 'ru-RU'
          ? `Скажи пользователю, что у него нет ${status === 'read' ? 'прочитанных' : 'непрочитанных'} писем.`
          : `Tell the user there are no ${status} emails.`;
        return { logMessage: `No ${status} emails to read.`, followUpPrompt };
      }

      const emailList = filtered.map((e: any) =>
        `From ${e.sender}, subject: ${e.subject}, content: ${e.snippet ?? e.content ?? ''}`).join('\n---\n');
      const followUpPrompt =
        `Summarize the following emails for the user in a friendly, conversational way. Be concise. Respond in language ${lang}:\n${emailList}`;
      return { logMessage: `Found ${filtered.length} emails to read.`, followUpPrompt };
    }

    case 'mail_control':
      if (args.action === 'read_all') {
        h.mailControl('read_all');
        return { logMessage: 'Successfully marked all emails as read.' };
      }
      if (args.action && (args.action === 'read' || args.action === 'delete') &&
          args.emails && Array.isArray(args.emails)) {
        h.mailControl(args.action, args.emails);
        return {
          logMessage: `Successfully performed "${args.action}" on ${args.emails.length} email(s).`
        };
      }
      throw new Error('MCP Error: Invalid args for mail_control.');

    /* ------------------- Dashboard / Widgets -------------------------- */
    case 'dashboard_control':
      if (args.action === 'swap' && args.widget_a && args.widget_b) {
        h.dashboardControl('swap', args.widget_a, args.widget_b);
        return { logMessage: `Successfully swapped ${args.widget_a} and ${args.widget_b}.` };
      }
      throw new Error('MCP Error: Invalid args for dashboard_control.');

    case 'widget_refine':
      if (args.widget_name && args.css_props && typeof args.css_props === 'object') {
        h.widgetRefine(args.widget_name, args.css_props);
        return { logMessage: `Successfully refined ${args.widget_name}.` };
      }
      throw new Error('MCP Error: Invalid args for widget_refine.');

    /* ----------------------- Devices ---------------------------------- */
    case 'device_control':
      if (args.device_name && typeof args.device_name === 'string' &&
          args.state && typeof args.state === 'string') {
        const dev  = args.device_name.toLowerCase();
        const state= args.state.toLowerCase();

        if (dev.includes('light')) {
          h.setLightState(state === 'on');
          return { logMessage: `Overhead light is now ${state === 'on' ? 'On' : 'Off'}.` };
        } else if (dev.includes('speaker')) {
          h.setSpeakerState(state === 'on' || state === 'playing');
          return { logMessage: `Kitchen speaker is now ${(state === 'on' || state === 'playing') ? 'Playing' : 'Paused'}.` };
        }
        throw new Error(`MCP Error: Unknown device "${args.device_name}".`);
      }
      throw new Error('MCP Error: Missing or invalid arguments for device_control.');

    /* ------------------- Misc / Widget CRUD --------------------------- */
    case 'reset_widget_styles':
      h.resetWidgetStyles();
      return { logMessage: 'Successfully reset all widget styles.' };

    case 'add_widget':
      if (args.type && args.title && args.config) {
        h.addWidget({ type: args.type, title: args.title, ...args.config });
        return { logMessage: `Successfully added widget "${args.title}".` };
      }
      throw new Error('MCP Error: Invalid args for add_widget.');

    case 'remove_widget':
      if (args.title) {
        h.removeWidget(args.title);
        return { logMessage: `Successfully removed widget "${args.title}".` };
      }
      throw new Error('MCP Error: Invalid args for remove_widget.');

    /* ------------------------ Default --------------------------------- */
    default:
      console.warn(`[mcpServer] Unhandled tool call "${name}"`);
      return { logMessage: `Tool "${name}" is not handled by this MCP server.` };
  }
}

/* ---------------------------------------------------------------------------
   Optional helper for client‑side direct calls (falls back to  any)
--------------------------------------------------------------------------- */
export async function callTool(name: string, args: Record<string, unknown>) {
  if (DEBUG) console.debug(`[mcpServer] callTool invoked: ${name}`, args);

  // 1) Try the SDK's native callTool if it exists
  let res: any;
  const hasCallTool = typeof (server as any).callTool === 'function';
  if (DEBUG && !hasCallTool) console.warn('[mcpServer] server.callTool not available, attempting fallbacks');
  if (hasCallTool) {
    try {
      res = await (server as any).callTool(name, args); // expects (toolName, args)
    } catch (err) {
      if (DEBUG) console.error('[mcpServer] native callTool failed:', err);
    }
  }

  // 1b) Try executeTool() if present (newer SDKs)
  if (res === undefined && typeof (server as any).executeTool === 'function') {
    if (DEBUG) console.debug('[mcpServer] Falling back to server.executeTool');
    try {
      res = await (server as any).executeTool(name, args);
    } catch (err) {
      console.error('[mcpServer] executeTool failed:', err);
    }
  }

  // 2) Fallback: invoke saved React handlers directly
  if (res === undefined && registeredHandlers) {
    switch (name) {
      case 'add_todo': {
        const { tasks } = args as any;
        registeredHandlers.addTodo(tasks);
        res = txt(`✅ Added ${tasks.length} task(s).`);
        break;
      }

      case 'todo_control': {
        const { action, tasks } = args as any;
        registeredHandlers.todoControl(action, tasks);
        res = txt(`🔄 ${action} → ${tasks.length}`);
        break;
      }

      case 'mail_control': {
        const { action, emails } = args as any;
        if (action === 'read_all') {
          registeredHandlers.mailControl('read_all');
        } else {
          registeredHandlers.mailControl(action, emails);
        }
        res = txt(`✉️ ${action} done.`);
        break;
      }

      case 'dashboard_control': {
        const { widget_a, widget_b } = args as any;
        registeredHandlers.dashboardControl('swap', widget_a as Widget, widget_b as Widget);
        res = txt(`🎛️ swapped ${widget_a} ↔ ${widget_b}`);
        break;
      }

      case 'read_todos': {
        const { status = 'incomplete' } = args as any;
        const list = registeredHandlers.getTodos();
        const filtered = list.filter(t =>
          status === 'all' ||
          (status === 'completed' ? t.done : !t.done)
        );

        res = filtered.length
          ? txt(filtered.map(t => `• ${t.done ? '✅' : '▢'} ${t.content}`).join('\n'))
          : txt(`📭 No ${status} todos.`);
        break;
      }

      case 'read_emails': {
        const { status = 'unread' } = args as any;
        const emails = registeredHandlers.getEmails();
        const filtered = emails.filter(e =>
          status === 'all' ||
          (status === 'read' ? e.read : !e.read)
        );

        res = filtered.length
          ? txt(filtered.map(e => `• ${e.sender}: ${e.subject ?? '(no subject)'}`).join('\n'))
          : txt(`📭 No ${status} mail.`);
        break;
      }
      // add more cases as needed for other tools
      default:
        console.warn(`[mcpServer] No fallback handler for "${name}"`);
    }
  }

  if (DEBUG) console.debug(`[mcpServer] callTool result (${name}):`, res);
  return res;
}

/* small text‑wrapper */
function txt(text: string) { return { content: [{ type: 'text', text }] } as any; }

/* ---------------------------------------------------------------------------
   Default Zustand‑backed handlers & helper init
--------------------------------------------------------------------------- */
export const storeHandlers: McpHandlers = {
  // --- Todos --------------------------------------------------------------
  addTodo(tasks) {
    const todoState = useTodoStore.getState();
    tasks.forEach((t) => todoState.addTodo(t));           // fire‑and‑forget
  },
  todoControl(action, tasks) {
    const todoState = useTodoStore.getState();
    tasks.forEach((task) => {
      const todo = todoState.todos.find((it) => it.content === task);
      if (!todo) return;
      if (action === 'complete') {
        todoState.toggleTodo(todo.id);
      } else {
        todoState.deleteTodo(todo.id);
      }
    });
  },
  getTodos() {
    return useTodoStore.getState().todos;
  },

  // --- Mail ---------------------------------------------------------------
  mailControl(action, emailCriteria) {
    const mailState = useMailStore.getState();
    const mark = (id: number) => { mailState.markAsRead(id); };
    const del  = (id: number) => { mailState.deleteEmail(id); };

    if (action === 'read_all') {
      mailState.emails.forEach((e) => mark(e.id));
      return;
    }

    const criteria = emailCriteria ?? [];
    criteria.forEach((c) => {
      mailState.emails
        .filter(
          (e) =>
            e.sender.toLowerCase().includes(c.sender.toLowerCase()) &&
            (c.subject ? (e.subject ?? '').toLowerCase().includes(c.subject.toLowerCase()) : true)
        )
        .forEach((e) => {
          if (action === 'read') mark(e.id);
          else del(e.id);
        });
    });
  },
  getEmails() {
    return useMailStore.getState().emails;
  },

  // --- Unused handlers (stubs) -------------------------------------------
  dashboardControl() { /* no‑op */ },
  widgetRefine()     { /* no‑op */ },
  setLightState()    { /* no‑op */ },
  setSpeakerState()  { /* no‑op */ },
  resetWidgetStyles(){ /* no‑op */ },
  addWidget()        { /* no‑op */ },
  removeWidget()     { /* no‑op */ },
};

/**
 * Convenience wrapper: boot MCP with the default store‑powered handlers.
 */
export async function initMcpWithStores(): Promise<void> {
  await initMcp(storeHandlers);
}