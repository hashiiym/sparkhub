export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

// Initialize Clients
function getClients() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is missing in environment variables. Please add GROQ_API_KEY to your Vercel Project Settings.");
    }

    const groq = new Groq({ apiKey });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    let supabase = null;
    if (supabaseUrl && supabaseServiceKey) {
        try {
            supabase = createClient(supabaseUrl, supabaseServiceKey);
        } catch (err) {
            console.warn("Failed to initialize Supabase client:", err);
        }
    }

    return { groq, supabase };
}

export async function GET() {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabase } = getClients();

        if (!supabase) {
            return NextResponse.json({ log: [] });
        }

        const { data, error } = await supabase
            .from("conversations")
            .select("user_message, ai_response, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Supabase GET Error:", error);
            return NextResponse.json({ error: "Failed to fetch conversation history" }, { status: 500 });
        }

        return NextResponse.json({ log: data || [] });
    } catch (error: unknown) {
        console.error("API GET Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;

        const { groq, supabase } = getClients();

        const systemPrompt = `You are "SparkHub," an elite, highly empathetic, and patient academic and career strategist tailored for the Indian education system. Your goal is to guide students to their highest potential through active listening and deep exploration.

You operate in a strict THREE-PHASE system. You must NEVER let the user know about these phases. You must transition naturally.

### PHASE 1: DEEP DISCOVERY & EMPATHY
Your objective is to understand the student's mind, not just their grade. 
1. Ask exactly ONE question at a time. Keep it conversational, warm, and highly empathetic.
2. Discover their academic stage (Grade/College Year), home state, and core interests.
3. If they give vague answers (e.g., "I like engineering but don't know which one"), DO NOT rush to conclusions. Dig deeper. Ask about their hobbies, what problems they want to solve in the world, or whether they prefer coding, building physical things, or designing.

### PHASE 2: CAREER MATCHMAKING (CRITICAL STEP)
Once you understand their interests, DO NOT generate the roadmap yet. 
1. Present 2 or 3 specific, exciting career paths tailored to their answers. (e.g., "Based on your love for physics and building things, we could look at 1) Mechatronics, 2) Electronics & Communication, or 3) Aerospace.")
2. Briefly explain what each path actually does in the real world.
3. ASK THE USER: "Which of these directions sounds the most exciting to you?"
4. You MUST wait for the user to pick a path or agree on a direction before moving to Phase 3.

### PHASE 3: THE BLUEPRINT TRIGGER
ONLY trigger this phase AFTER the user has explicitly chosen or agreed to a specific career path from Phase 2.
Once triggered, STOP asking questions and generate the master career blueprint. 

CRITICAL INSTRUCTION: Your Phase 3 response MUST be output strictly as a valid JSON object. Do NOT wrap it in markdown code blocks (no \`\`\`json). Do not include any conversational text before or after the JSON.

The JSON must exactly follow this schema:
{
  "profile_summary": "A 2-sentence empowering analytical summary of the student's potential based on everything they shared.",
  "recommended_paths": ["The specific path they chose", "A closely related secondary path"],
  "academic_strategy": {
    "key_subjects": ["Subject 1", "Subject 2"],
    "focus_areas": "Specific high-yield concepts to master right now for their chosen path."
  },
  "entrance_exams": ["Primary Exam (e.g., JEE Main/Advanced)", "State Exam (e.g., KEAM)"],
  "target_colleges": ["Top-Tier Option", "State/Realistic Option", "Safe Option"],
  "skill_development": ["Technical Skill 1", "Technical Skill 2", "Soft Skill 1"],
  "timeline": [
    {
      "phase_name": "Immediate Phase (e.g., 10th-12th Prep)",
      "focus": "Core structural target for this timeline window.",
      "milestones": ["Milestone 1", "Milestone 2"]
    },
    {
      "phase_name": "College Entry & Foundation (Years 1-2)",
      "focus": "Acclimatization, basic building, and networking.",
      "milestones": ["Join technical/entrepreneurship clubs", "Build a specific starter project"]
    },
    {
      "phase_name": "Specialization & Transition (Years 3-4)",
      "focus": "Core industry alignment and placement strategy.",
      "milestones": ["Advanced ecosystem project", "Resume mapping and internships"]
    }
  ]
}`;

        // Map messages: Map incoming client message roles to standard ChatCompletion blocks
        // e.g., frontend 'ai' or 'assistant' maps to 'assistant'
        const mappedMessages = messages.map((m: { role: string; content: string }) => ({
            role: m.role === "ai" || m.role === "assistant" ? "assistant" : "user",
            content: m.content
        }));

        const chatCompletionMessages: { role: "system" | "user" | "assistant", content: string }[] = [
            { role: "system", content: systemPrompt },
            ...mappedMessages
        ];

        const candidateModels = [
            process.env.GROQ_MODEL,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
            "llama-3.1-8b-instant",
            "llama-3.3-70b-versatile"
        ].filter(Boolean) as string[];

        let aiResponse = "";
        let lastError: unknown = null;

        for (const model of candidateModels) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: chatCompletionMessages,
                    model: model,
                    temperature: 0.7,
                    max_completion_tokens: 1500,
                    top_p: 1,
                });
                aiResponse = completion.choices[0]?.message?.content || "";
                if (aiResponse) {
                    break;
                }
            } catch (err) {
                lastError = err;
                console.warn(`Groq model ${model} failed, trying next candidate:`, err);
            }
        }

        if (!aiResponse) {
            throw lastError || new Error("Failed to receive a response from Groq.");
        }

        // Persist to Supabase if configured
        if (supabase) {
            const { error } = await supabase
                .from("conversations")
                .insert({
                    user_id: userId,
                    user_message: userQuery,
                    ai_response: aiResponse,
                });

            if (error) {
                console.error("Supabase Insert Error:", error);
            }
        }

        return NextResponse.json({ message: aiResponse });

    } catch (error: unknown) {
        console.error("API POST Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
