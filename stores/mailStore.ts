// MailStore.ts
import { create } from 'zustand';
import { Email } from '../types';
import * as mailService from '../services/mailService';

interface MailState {
  emails: Email[];
  loadEmails: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  deleteEmail: (id: number) => Promise<void>;
}

export const useMailStore = create<MailState>((set) => ({
  emails: [],

  loadEmails: async () => {
    const emails = await mailService.getAllEmails();     // вызываем сервис
    set({ emails });
  },

  markAsRead: async (id) => {
    await mailService.markEmailAsRead(id);               // сервис обновления
    set((s) => ({
      emails: s.emails.map(e => e.id === id ? { ...e, read: true } : e),
    }));
  },

  deleteEmail: async (id) => {
    await mailService.deleteEmailById(id);               // сервис удаления
    set((s) => ({
      emails: s.emails.filter(e => e.id !== id),
    }));
  },
}));
