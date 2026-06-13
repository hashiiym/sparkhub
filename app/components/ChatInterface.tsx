"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import RoadmapTimeline from "./RoadmapTimeline";
import { useUser, SignInButton } from "@clerk/nextjs";

interface Message {
    id: number;
    role: "user" | "assistant";
    content: string;
}

const defaultGreeting: Message = {
    id: 1, 
    role: "assistant", 
    content: "Welcome to SparkHub. I am an advanced academic and career strategist. To begin, could you tell me a little bit about your current educational stage?"
};

export default function ChatInterface() {
    const { isSignedIn, isLoaded } = useUser();
    const [messages, setMessages] = useState<Message[]>([defaultGreeting]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            setIsLoadingHistory(false);
            return;
        }

        // Fetch history on mount
        const fetchHistory = async () => {
            try {
                const response = await fetch("/api/chat");
                if (response.ok) {
                    const data = await response.json();
                    if (data.log && data.log.length > 0) {
                        const historyMessages: Message[] = [];
                        let counter = Date.now() - data.log.length * 1000;
                        data.log.forEach((record: { user_message: string; ai_response: string }) => {
                            historyMessages.push({ id: counter++, role: "user", content: record.user_message });
                            historyMessages.push({ id: counter++, role: "assistant", content: record.ai_response });
                        });
                        setMessages(historyMessages);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [isSignedIn, isLoaded]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isLoadingHistory]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = { id: Date.now(), role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, userMsg] }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch response");
            }

            const data = await response.json();
            setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: data.message }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, role: "assistant", content: "I'm currently unable to connect to my neural network. Please check your internet connection or API keys." }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const parseRoadmapData = (content: string) => {
        try {
            // Remove markdown formatting that LLMs sometimes insert around JSON
            const cleanedContent = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(cleanedContent);
            
            if (parsed && parsed.profile_summary && parsed.timeline && Array.isArray(parsed.timeline)) {
                return parsed;
            }
            
            // Handle legacy roadmap format for historical messages
            if (parsed && parsed.roadmap && Array.isArray(parsed.roadmap)) {
                return {
                    profile_summary: "Previous Roadmap Blueprint",
                    recommended_paths: [],
                    academic_strategy: { key_subjects: [], focus_areas: "" },
                    entrance_exams: [],
                    target_colleges: [],
                    skill_development: [],
                    timeline: parsed.roadmap.map((item: { year?: number; phase_name?: string; focus?: string; milestones?: string[] }) => ({
                        phase_name: `Year ${item.year || item.phase_name || "Phase"}`,
                        focus: item.focus || "",
                        milestones: item.milestones || []
                    }))
                };
            }
        } catch {
            return null;
        }
        return null;
    };

    const renderMessageContent = (msg: Message) => {
        if (msg.role === "assistant") {
            const roadmapData = parseRoadmapData(msg.content);
            if (roadmapData) {
                return <RoadmapTimeline data={roadmapData} />;
            }
            return (
                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#111] prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
            );
        }
        return msg.content;
    };

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto h-[75vh] relative bg-black">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide pb-24">
                {isLoadingHistory ? (
                    <div className="flex w-full justify-center items-center h-full">
                        <div className="flex gap-2">
                            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></span>
                            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl text-lg leading-relaxed ${msg.role === "user"
                                        ? "bg-[#1a1a1a] text-white rounded-tr-sm"
                                        : "text-white rounded-tl-sm markdown-content"
                                        }`}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles size={14} className="text-yellow-400" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">SparkHub</span>
                                        </div>
                                    )}
                                    {renderMessageContent(msg)}
                                </div>
                            </motion.div>
                        ))}
                        {isTyping && (
                            <motion.div
                                key="typing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex w-full justify-start"
                            >
                                <div className="text-gray-500 text-sm ml-2 flex items-center gap-2 font-mono">
                                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent">
                {isSignedIn ? (
                    <div className="relative flex items-center bg-[#111] rounded-full border border-[#333] focus-within:border-white/20 transition-colors shadow-lg">
                        <input
                            type="text"
                            className="w-full bg-transparent text-white p-4 pl-6 outline-none placeholder-gray-600"
                            placeholder="Ask SparkHub anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isTyping}
                            className="p-3 mr-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 hover:bg-white/10 rounded-full"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center w-full pb-2">
                        <SignInButton mode="modal">
                            <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-3 px-8 rounded-full transition-colors shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                                Sign in to start your career mapping
                            </button>
                        </SignInButton>
                    </div>
                )}
            </div>
        </div>
    );
}
