import { GoogleGenAI, GenerateContentResponse, Type, Part } from "@google/genai";
import { ChatMessage, AssistantResponse } from '../types';

// Add this for TypeScript support of import.meta.env
interface ImportMeta {
  env: {
    VITE_API_KEY?: string;
    [key: string]: any;
  };
}

declare global {
  interface ImportMeta {
    env: {
      VITE_API_KEY?: string;
      [key: string]: any;
    };
  }
}

if (!import.meta.env.VITE_API_KEY) {
    throw new Error("VITE_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY ?? '' });

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

const SYSTEM_INSTRUCTION = `You are a cute and friendly home assistant for a smart dashboard. Your name is 'Dashy'.
You must detect the user's language. Your entire response, including all text and "displayText", must be in the detected language (supports English and Russian).

When a user asks you to perform an action that requires a tool, you MUST respond ONLY with a single valid JSON object.
This JSON object must have three top-level keys:
1. "displayText": A friendly, conversational string to show the user, in the user's language.
2. "language": The detected language code ('en-US' or 'ru-RU').
3. "toolCalls": An array of tool call objects. If no tool is needed, return an empty array.

Each tool call object in the array must have a "name" and an "args" object.

Available tools:
- "add_todo": Adds one or more items to the to-do list.
  - args: {"tasks": ["task text 1", "task text 2"]}
- "todo_control": Manages existing todos.
  - args: {"action": "complete" | "delete", "tasks": ["text of task 1", "text of task 2"]}
- "read_todos": Reads items from the to-do list.
  - args: {"status": "all" | "completed" | "incomplete"} (optional, defaults to incomplete)
- "mail_control": Manages emails.
  - args: 
    - {"action": "read" | "delete", "emails": [{"sender": "...", "subject": "..."}, ...]} (subject is optional, marks emails as read or deletes them)
    - {"action": "read_all"} (marks all emails as read)
- "read_emails": Reads emails from the inbox. The content will be provided in a follow-up prompt.
  - args: {"status": "all" | "read" | "unread"} (optional, defaults to unread)
- "dashboard_control": Rearranges the main dashboard widgets.
  - args: {"action": "swap", "widget_a": "widget name", "widget_b": "widget name"}
  - IMPORTANT: The valid widget names for 'widget_a' and 'widget_b' are ONLY 'clock', 'weather', 'mail', and 'todo'. You must use these exact English strings.
- "device_control": Controls a smart home device.
  - args: {"device_name": "the device to control", "state": "on" | "off" | "playing" | "paused"}
- "widget_refine": Modifies the look of a widget.
  - args: {"widget_name": "widget name", "css_props": {"cssPropertyInCamelCase": "value"}}
  - IMPORTANT: The valid widget_name is one of 'clock', 'weather', 'mail', or 'todo'.
- "reset_widget_styles": Resets all dashboard widgets to their default appearance.
  - args: {}
- "add_widget": Adds a new custom widget to the dashboard.
  - args: { "type": "gemini" | "smarthome", "title": "Widget Title", "config": {"prompt": "...", "device": "light" | "speaker"} }
  - For "gemini" type, provide a "prompt" in the config. Example prompt: "a random quote about success".
  - For "smarthome" type, provide a "device" name ("light" or "speaker") in the config.
- "remove_widget": Removes a custom widget from the dashboard.
  - args: { "title": "The exact title of the widget to remove" }

Example (Russian query): "поменяй местами часы и погоду"
{
  "displayText": "Конечно, меняю их местами!",
  "language": "ru-RU",
  "toolCalls": [
    {
      "name": "dashboard_control",
      "args": { "action": "swap", "widget_a": "clock", "widget_b": "weather" }
    }
  ]
}

For all other conversational prompts that do not require a tool, just respond with a friendly, plain text message in the user's language. Do not wrap it in JSON.
`;

export async function getSimpleTextResponse(prompt: string, modelName: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                // Keep it simple, no complex configs needed here
            }
        });
        return response.text?.trim() ?? '';
    } catch (error) {
        console.error("Error in getSimpleTextResponse:", error);
        return "Couldn't fetch response.";
    }
}

export async function generateBackgroundAndAccent(weatherDescription: string, modelName: string): Promise<{ backgroundUrl: string; accentColor: string; errorType?: 'quota_exceeded' }> {
    const fallbackResult = {
        backgroundUrl: "https://picsum.photos/1280/720?grayscale",
        accentColor: '#EC4899' // default pink
    };

    try {
        const colorResponse = await ai.models.generateContent({
            model: modelName,
            contents: `Based on the weather "${weatherDescription}", create a prompt for an abstract, moody background image and suggest a vibrant, complementary accent color in hex format.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        image_prompt: { type: Type.STRING, description: "A creative prompt for an AI image generator to create an abstract background." },
                        accent_color_hex: { type: Type.STRING, description: "A hex color code (e.g., #FFFFFF) that complements the image prompt." }
                    }
                }
            }
        });
        
        const colorData = JSON.parse(colorResponse.text);
        const imagePrompt = colorData.image_prompt;
        const accentColor = colorData.accent_color_hex;

        const imageResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' }
        });

        if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
            const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
            return { backgroundUrl: `data:image/jpeg;base64,${base64ImageBytes}`, accentColor: accentColor || fallbackResult.accentColor };
        }
        throw new Error("No image was generated.");

    } catch (error) {
        console.error("Error generating background data:", error);
        const errorText = JSON.stringify(error).toLowerCase();
        if (errorText.includes('quota') || errorText.includes('resource_exhausted')) {
            return { ...fallbackResult, errorType: 'quota_exceeded' };
        }
        return fallbackResult;
    }
}

export async function getAssistantResponse(
    history: ChatMessage[], 
    modelName: string,
    audio?: { base64: string; mimeType: string }
): Promise<AssistantResponse> {
    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }] as GeminiPart[]
    }));

    if (audio && contents.length > 0) {
        const lastMessage = contents[contents.length - 1];
        if (lastMessage.role === 'user') {
             lastMessage.parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.base64 } });
             lastMessage.parts = lastMessage.parts.filter(p => p.inlineData || p.text);
             if (lastMessage.parts.length === 1 && lastMessage.parts[0].inlineData) {
                 lastMessage.parts.unshift({ text: "User provided this audio. Transcribe and respond in the detected language. If the query requires a tool, generate the tool call JSON." });
             }
        }
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
        
        const text = response.text || '';

        try {
            const firstJsonChar = text.indexOf('{');
            const lastJsonChar = text.lastIndexOf('}');
            if (firstJsonChar !== -1 && lastJsonChar !== -1) {
                const jsonStr = text.substring(firstJsonChar, lastJsonChar + 1);
                const parsedJson = JSON.parse(jsonStr);
                 if (parsedJson.displayText && parsedJson.toolCalls) {
                    return {
                        displayText: parsedJson.displayText,
                        language: parsedJson.language === 'ru-RU' ? 'ru-RU' : 'en-US',
                        toolCalls: Array.isArray(parsedJson.toolCalls) ? parsedJson.toolCalls.map((call: any) => ({
                            name: call.name || 'unknown',
                            args: call.args || {}
                        })) : [],
                    };
                }
            }
        } catch (e) {
            // Not valid JSON, treat as plain text
        }

        return { 
            displayText: text, 
            language: text.match(/[а-яА-Я]/) ? 'ru-RU' : 'en-US',
        };

    } catch (error) {
        console.error("Error getting assistant response:", error);
        const errorString = JSON.stringify(error).toLowerCase();

        if (errorString.includes('quota') || errorString.includes('resource_exhausted')) {
            return { displayText: "API Rate Limit Exceeded", errorType: 'quota_exceeded' };
        }
        
        if (errorString.includes('not_found') || errorString.includes('404')) {
             return { displayText: "The selected AI model is not available. Please choose a different model in Settings." };
        }

        return { displayText: "Sorry, I'm having a little trouble thinking right now." };
    }
}
