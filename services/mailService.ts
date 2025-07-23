// mailService.ts
import { supabase } from './supaService';
import { Email } from '../types';

export const getAllEmails = async (): Promise<Email[]> => {
  // Запрос всех писем, сортировка по дате
  const { data, error } = await supabase
    .from<Email>('mail')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const markEmailAsRead = async (id: number): Promise<void> => {
  // Обновляем поле read
  const { error } = await supabase
    .from('mail')
    .update({ read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
};

export const deleteEmailById = async (id: number): Promise<void> => {
  // Удаляем письмо по id
  const { error } = await supabase
    .from('mail')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
};
