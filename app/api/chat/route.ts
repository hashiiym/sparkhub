import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CosmosClient } from "@azure/cosmos";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to get clients lazily
function getClients() {
    // 1. Gemini
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 2. Cosmos DB
    let cosmosClient = null;
    const connectionString = process.env.COSMOS_CONNECTION_STRING;

    // Debug logging (masked)
    console.log("Config Check:");
    console.log("- Gemini Key:", apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "MISSING");

    // Combined logic: Prefer Connection String, fallback to legacy
    if (connectionString && connectionString.includes("AccountKey=")) {
        try {
            cosmosClient = new CosmosClient(connectionString);
        } catch (e) {
            console.error("Invalid Cosmos Connection String:", e);
        }
    } else {
        const endpoint = process.env.COSMOS_DB_ENDPOINT;
        const key = process.env.COSMOS_DB_KEY;
        if (endpoint && key) {
            try {
                cosmosClient = new CosmosClient({ endpoint, key });
            } catch (e) {
                console.error("Invalid Cosmos Endpoint/Key:", e);
            }
        }
    }

    return { model, cosmosClient };
}

export async function POST(req: Request) {
    try {
        let userId = null;
        try {
            const authResult = await auth();
            userId = authResult?.userId;
        } catch (authErr) {
            console.warn("Clerk Auth Error (likely missing secret keys). Using fallback user.");
        }

        if (!userId) {
            userId = "anonymous-user"; // Fallback to allow testing without Clerk secrets
        }

        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;

        // Init clients inside request to capture config errors safely
        const { model, cosmosClient } = getClients();

        // 1. Construct System Prompt
        const systemPrompt = `You are SparkHub, a career counselor for 10th-grade students.
PHASE 1: Ask 3-4 specific questions one-by-one to identify the user's interests, hobbies, and favorite subjects.
PHASE 2: Once the user provides enough detail, generate a comprehensive 6-year career roadmap.

Years 1-2: Specific 11th/12th grade stream and entrance exam focus.

Years 3-6: Recommended Degree, specific skill-building milestones, and internships.

Keep the tone encouraging and professional.`;

        // Configure Gemini messages format. Gemini expects an array of { role: 'user' | 'model', parts: [{ text: string }] }
        // The messages array from request might be in OpenAI format: { role: 'user' | 'assistant', content: string }
        // We need to map 'assistant' to 'model'
        const history = messages.slice(0, -1).filter((m: any) => m.role !== "system").map((m: any) => ({
            role: m.role === "assistant" ? "model" : m.role,
            parts: [{ text: m.content }]
        }));

        // 2. Generate Response
        const chat = model.startChat({
            systemInstruction: systemPrompt,
            history: history,
        });

        const result = await chat.sendMessage(userQuery);
        const aiMessageContent = result.response.text();

        // 3. Persist to Cosmos DB
        if (cosmosClient) {
            try {
                const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE || "SparkhubDB");
                const container = database.container(process.env.COSMOS_DB_CONTAINER || "Conversations");

                const record = {
                    id: `${userId}-${Date.now()}`,
                    userId: userId,
                    userMessage: userQuery,
                    aiResponse: aiMessageContent,
                    timestamp: new Date().toISOString(),
                    model: "gemini-2.5-flash"
                };

                await container.items.create(record);
            } catch (dbError) {
                console.error("Cosmos DB Write Error:", dbError);
            }
        } else {
            console.warn("Cosmos Client not initialized. Skipping persistence.");
        }

        return NextResponse.json({ message: aiMessageContent });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
