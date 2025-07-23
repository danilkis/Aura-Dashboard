# Aura Dashboard

**Aura Dashboard** — это умный дашборд на React + TypeScript, интегрированный с MCP-сервером и Gemini AI через `@modelcontextprotocol/sdk`.

## Основные возможности

* Умный помощник «Dashy» на базе Gemini: голосовой и текстовый ввод, инструментальные вызовы (to‑do, почта, управление устройствами).
* Словарь задач (to‑do) и почтовый клиент с синхронизацией через Supabase.
* Настраиваемая панель виджетов: часы, погода, почта, to‑do и кастомные виджеты.
* Хранение состояния в Shared Storage / `localStorage` между сессиями.

## Структура проекта

* `src/App.tsx` — точка входа, маршрутизация представлений и интеграция с MCP.
* `src/mcpServer.ts` — обёртка для вызова инструментов MCP через SDK.
* `src/services/geminiService.ts` — клиент для общения с Gemini AI.
* `src/components` — UI-компоненты: Sidebar, DashboardView, MailSummary, AssistantView и другие.
* `src/stores` — Zustand-сторы для задач и писем.

© 2025 CMD/OPT/S
