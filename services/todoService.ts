import { supabase } from './supaService';
import { Todo } from '../types';

export const fetchTodos = async (): Promise<Todo[] | null> => {
  console.log('[fetchTodos] Fetching todos...');
  const { data, error } = await supabase.from('todos').select('*').order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchTodos] Error:', error.message);
    return null;
  }

  console.log('[fetchTodos] Fetched:', data);
  return data;
};

export const createTodo = async (content: string): Promise<Todo | null> => {
  console.log('[createTodo] Creating todo:', content);
  const { data, error } = await supabase
    .from('todos')
    .insert([{ content, done: false }])
    .select()
    .single();

  if (error) {
    console.error('[createTodo] Error:', error.message);
    return null;
  }

  console.log('[createTodo] Created:', data);
  return data;
};

export const updateTodo = async (id: number, done: boolean) => {
  console.log(`[updateTodo] Updating todo ${id} to done=${done}`);
  const { error } = await supabase
    .from('todos')
    .update({ done })
    .eq('id', id);

  if (error) console.error('[updateTodo] Error:', error.message);
  else console.log('[updateTodo] Success');
};

export const deleteTodoById = async (id: number) => {
  console.log(`[deleteTodoById] Deleting todo ${id}`);
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) console.error('[deleteTodoById] Error:', error.message);
  else console.log('[deleteTodoById] Deleted');
};
