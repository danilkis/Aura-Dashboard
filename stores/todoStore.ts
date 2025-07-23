import { create } from 'zustand';
import { fetchTodos, createTodo, updateTodo, deleteTodoById } from '../services/todoService';
import { Todo } from '../types';

interface TodoState {
  todos: Todo[];
  loadTodos: () => Promise<void>;
  addTodo: (content: string) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  setTodos: (todos: Todo[]) => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],

  loadTodos: async () => {
    console.log('[Store] Loading todos...');
    const todos = await fetchTodos();
    if (todos) {
      console.log('[Store] Setting fetched todos');
      set({ todos });
    }
  },

  addTodo: async (content) => {
    console.log('[Store] Adding todo:', content);
    const newTodo = await createTodo(content);
    if (newTodo) {
      set((state) => ({ todos: [...state.todos, newTodo] }));
      console.log('[Store] Todo added to state');
    }
  },

  toggleTodo: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) {
      console.warn('[Store] Todo not found for toggle:', id);
      return;
    }
    await updateTodo(id, !todo.done);
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
    console.log('[Store] Todo toggled:', id);
  },

  deleteTodo: async (id) => {
    await deleteTodoById(id);
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    }));
    console.log('[Store] Todo deleted from state:', id);
  },

  setTodos: (todos) => {
    console.log('[Store] setTodos called with:', todos.length, 'items');
    set({ todos });
  },
}));
