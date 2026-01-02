import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CalendarEvent, PasswordEntry } from './firebase';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

// Use Gemini 3 Flash Preview - latest available model
const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
    }
});

export interface AIResponse {
    type: 'text' | 'calendar_add' | 'calendar_query' | 'password_query' | 'password_add';
    message: string;
    data?: {
        title?: string;
        date?: Date;
        description?: string;
        reminder?: boolean;
        searchTerm?: string;
        password?: string;
        username?: string;
    };
}

const SYSTEM_PROMPT = `Kamu adalah asisten pribadi AI yang membantu user mengelola catatan, kalender, dan password.

KEMAMPUAN KAMU:
1. Menambah event ke kalender: Jika user menyebut tanggal/waktu dan kegiatan, parse dan kembalikan dalam format JSON
2. Mencari password: Jika user bertanya tentang password suatu akun/email/website
3. Menyimpan password: Jika user ingin menyimpan password baru
4. Chat biasa: Jawab pertanyaan umum dengan ramah

FORMAT RESPONS (WAJIB dalam JSON):
{
  "type": "calendar_add" | "calendar_query" | "password_query" | "password_add" | "text",
  "message": "Pesan untuk user",
  "data": {
    // Untuk calendar_add:
    "title": "Judul event",
    "date": "YYYY-MM-DD",
    "description": "Deskripsi (opsional)",
    "reminder": true/false
    
    // Untuk password_query:
    "searchTerm": "kata kunci pencarian"
    
    // Untuk password_add:
    "title": "Nama akun/website",
    "username": "username/email",
    "password": "password"
  }
}

CONTOH:
User: "Tanggal 15 Januari ada meeting sama client"
Response: {"type":"calendar_add","message":"Saya sudah menambahkan event meeting sama client pada tanggal 15 Januari.","data":{"title":"Meeting sama client","date":"2026-01-15","reminder":true}}

User: "Password email alfan@gmail.com apa ya?"
Response: {"type":"password_query","message":"Saya akan mencari password untuk alfan@gmail.com","data":{"searchTerm":"alfan@gmail.com"}}

User: "Simpan password Instagram user: alfan123 pass: mypassword123"
Response: {"type":"password_add","message":"Password Instagram berhasil disimpan!","data":{"title":"Instagram","username":"alfan123","password":"mypassword123"}}

User: "Halo, apa kabar?"
Response: {"type":"text","message":"Halo! Saya baik-baik saja. Ada yang bisa saya bantu hari ini? Saya bisa membantu mencatat jadwal di kalender atau mengelola password kamu."}

PENTING:
- Selalu kembalikan JSON yang valid
- Untuk tanggal, gunakan tahun 2026 jika tidak disebutkan
- Jadilah ramah dan helpful
- Jika tidak yakin, tanyakan untuk klarifikasi`;

export const sendMessage = async (
    userMessage: string,
    context?: {
        events?: CalendarEvent[];
        passwords?: PasswordEntry[];
    }
): Promise<AIResponse> => {
    try {
        if (!API_KEY) {
            return {
                type: 'text',
                message: 'API Key Gemini belum dikonfigurasi. Silakan tambahkan VITE_GEMINI_API_KEY di file .env'
            };
        }

        // Build context information
        let contextInfo = '';

        if (context?.events && context.events.length > 0) {
            contextInfo += '\n\nEVENT KALENDER USER:\n';
            context.events.slice(0, 10).forEach(e => {
                contextInfo += `- ${e.title} (${e.date.toLocaleDateString('id-ID')})\n`;
            });
        }

        if (context?.passwords && context.passwords.length > 0) {
            contextInfo += '\n\nDAFTAR PASSWORD TERSIMPAN (tanpa password asli):\n';
            context.passwords.forEach(p => {
                contextInfo += `- ${p.title}${p.username ? ` (${p.username})` : ''}\n`;
            });
        }

        const fullPrompt = `${SYSTEM_PROMPT}${contextInfo}\n\nUser: ${userMessage}`;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        // Try to parse JSON response
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = text;
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            } else {
                // Try to find JSON object directly
                const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
                if (jsonObjectMatch) {
                    jsonStr = jsonObjectMatch[0];
                }
            }

            const parsed = JSON.parse(jsonStr);

            // Process date if present
            if (parsed.data?.date && typeof parsed.data.date === 'string') {
                parsed.data.date = new Date(parsed.data.date);
            }

            return {
                type: parsed.type || 'text',
                message: parsed.message || text,
                data: parsed.data
            };
        } catch {
            // If JSON parsing fails, return as text
            return {
                type: 'text',
                message: text
            };
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        return {
            type: 'text',
            message: 'Maaf, terjadi kesalahan saat memproses pesan. Silakan coba lagi.'
        };
    }
};

// Quick parse for calendar commands without AI (fallback)
export const quickParseCalendarCommand = (text: string): { title: string; date: Date } | null => {
    // Pattern: "tanggal DD ada/acara TITLE" or "DD/MM ada TITLE"
    const patterns = [
        /tanggal\s+(\d{1,2})(?:\s+(\w+))?\s+(?:ada|acara|event)\s+(.+)/i,
        /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(?:ada|acara|event)\s+(.+)/i,
        /(\d{1,2})\s+(\w+)\s+(?:ada|acara|event)\s+(.+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Extract and parse date
            const day = parseInt(match[1]);
            const monthStr = match[2];
            let month = new Date().getMonth();

            // Parse Indonesian month names
            const monthMap: Record<string, number> = {
                'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
                'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
                'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
            };

            if (monthStr && monthMap[monthStr.toLowerCase()] !== undefined) {
                month = monthMap[monthStr.toLowerCase()];
            } else if (monthStr && !isNaN(parseInt(monthStr))) {
                month = parseInt(monthStr) - 1;
            }

            const title = match[3] || match[4] || 'Event';
            const date = new Date(2026, month, day);

            return { title: title.trim(), date };
        }
    }

    return null;
};
