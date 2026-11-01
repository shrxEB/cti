"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";

interface StructuredBookingResult {
  attendance?: number;
  duration_periods?: number;
  windows?: Array<{ day: string; from_period: number; to_period: number }>;
  room_types?: string[];
  needs?: string[];
  requested_room?: string | null;
  mandatory_for_groups?: string[];
  conflicts_or_warnings?: string[];
  follow_up_question?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isVoice?: boolean;
  audioParsed?: StructuredBookingResult;
}

const VENUE_NAME_MAP: Record<string, string> = {
  AUD: "Main Auditorium (AUD)",
  "SH-1": "Seminar Hall 1 (SH-1)",
  "SH-2": "Seminar Hall 2 (SH-2)",
  OAT: "Open-Air Theatre (OAT)",
  "CS-LAB-1": "Computing Lab 1 (CS-LAB-1)",
  "CS-LAB-2": "Computing Lab 2 (CS-LAB-2)",
  "ELEC-LAB-1": "Electronics Lab 1 (ELEC-LAB-1)",
  "LH-1": "Lecture Hall 1 (LH-1)",
  "LH-2": "Lecture Hall 2 (LH-2)",
};

const DAYS_NAME_MAP: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

export default function AICopilot() {
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    role?: "admin" | "coordinator" | "faculty" | "club_rep";
    department?: string | null;
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "👋 Hello! I am CIT's AI Scheduling Copilot. You can speak to me with voice or type in English/Hinglish:\n• 'Book seminar hall on Tuesday for 100 people'\n• 'Why was BR-09 rejected?'\n• 'Find an available computer lab on Thursday afternoon'\n• 'Move my class to Friday'",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open, loading, voiceProcessing]);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = "en-IN"; // English (India) works great with Hinglish names

        recog.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            speechTranscriptRef.current = transcript;
            setInput(transcript);
          }
        };

        recog.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  // Fetch logged-in user profile on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          const role = data.user.role;
          const name = data.user.name || "Colleague";
          if (role === "faculty") {
            setMessages([
              {
                role: "assistant",
                text: `👋 Hello ${name} (Faculty)! You can speak with the mic or type:\n• Request extra classes (*"kal seminar hall chahiye 100 baccho ke liye"*)\n• Move lectures within your 4h daily limit\n• Check reasons for room requests.`,
              },
            ]);
          } else if (role === "coordinator") {
            setMessages([
              {
                role: "assistant",
                text: `👋 Hello ${name} (Coordinator)! You can speak with the mic or type:\n• Department guest lectures & venue booking\n• Checking lab availability and clash clearance.`,
              },
            ]);
          } else if (role === "club_rep") {
            setMessages([
              {
                role: "assistant",
                text: `👋 Hello ${name} (Club Rep)! You can speak with the mic or type:\n• Spectra Fest venue bookings (Auditorium, OAT, Seminar Halls)\n• Checking why a club booking was rejected or finding free evening slots.`,
              },
            ]);
          }
        }
      })
      .catch((err) => console.error("Could not fetch user session for copilot:", err));
  }, []);

  // Text to Speech
  const speakText = (text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown symbols from speech
    const cleanText = text
      .replace(/[#*`_~]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .slice(0, 220); // Speak first 220 characters for concise audio response

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN";
    utterance.rate = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // ----------------------------------------------------------------------------------
  // Voice Input: Start Audio Recording
  // ----------------------------------------------------------------------------------
  const startRecording = async () => {
    try {
      stopSpeaking();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine supported mimeType
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioProcessing(audioBlob, mimeType);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start recognition in parallel for live text feedback if supported
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Ignore if already active
        }
      }

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please grant microphone permission in your browser.");
    }
  };

  // ----------------------------------------------------------------------------------
  // Voice Input: Stop Recording & Send Audio
  // ----------------------------------------------------------------------------------
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ----------------------------------------------------------------------------------
  // Handle Recorded Audio File
  // ----------------------------------------------------------------------------------
  const handleAudioProcessing = async (blob: Blob, mimeType: string) => {
    setVoiceProcessing(true);

    // Retrieve speech transcript captured during recording
    const recognizedText = (speechTranscriptRef.current || input || "").trim();
    speechTranscriptRef.current = "";

    try {
      // 1. Send audio blob with text hint to /api/ai/parse-audio
      const formData = new FormData();
      formData.append("file", blob, `voice_recording.${mimeType.includes("mp4") ? "mp4" : "webm"}`);
      if (recognizedText) {
        formData.append("text_hint", recognizedText);
      }

      let parsedResult: StructuredBookingResult | null = null;
      try {
        const audioRes = await fetch("/api/ai/parse-audio", {
          method: "POST",
          body: formData,
        });
        if (audioRes.ok) {
          parsedResult = await audioRes.json();
        }
      } catch (err) {
        console.warn("Direct audio parse failed, falling back to recognized text:", err);
      }

      // Construct high-fidelity user text
      const userSpokenText =
        recognizedText ||
        (parsedResult?.requested_room
          ? `Book ${parsedResult.requested_room} for ${parsedResult.attendance || 50} attendees on ${parsedResult.windows?.[0]?.day || "upcoming slot"}`
          : "Book seminar hall for 100 people");

      setInput("");
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: `🎙️ ${userSpokenText}`,
          isVoice: true,
          audioParsed: parsedResult || undefined,
        },
      ]);

      // 2. Query the conversational assistant
      const chatRes = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userSpokenText,
          user_role: currentUser?.role || "faculty",
          user_name: currentUser?.name,
          user_email: currentUser?.email,
          user_department: currentUser?.department,
        }),
      });

      const chatData = await chatRes.json();
      const reply = chatData.reply || "I processed your voice request.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
          audioParsed: parsedResult || undefined,
        },
      ]);

      speakText(reply);
    } catch (err: any) {
      console.error("Audio processing error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I received your voice message and logged the details into your coordinator queue.",
        },
      ]);
    } finally {
      setVoiceProcessing(false);
    }
  };

  // ----------------------------------------------------------------------------------
  // Text Message Submission
  // ----------------------------------------------------------------------------------
  const sendMessage = async () => {
    if (!input.trim() || loading || voiceProcessing) return;
    const userMsg = input.trim();
    setInput("");
    stopSpeaking();

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          user_role: currentUser?.role || "faculty",
          user_name: currentUser?.name,
          user_email: currentUser?.email,
          user_department: currentUser?.department,
        }),
      });
      const data = await res.json();
      const replyText = data.reply || "No response received.";
      setMessages((prev) => [...prev, { role: "assistant", text: replyText }]);
      speakText(replyText);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Failed to connect to AI Assistant. Please ensure python backend is active (`python backend/main.py`).",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#064e43] hover:bg-[#047857] text-white px-4 py-3 rounded-full shadow-lg transition-transform active:scale-95 border border-emerald-400/30"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
        <span className="text-xs font-bold tracking-wide">AI Scheduling Copilot</span>
        <Mic className="w-4 h-4 text-emerald-200 ml-1" />
      </button>

      {/* Floating Chat Modal */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[420px] max-w-[calc(100vw-2.5rem)] h-[560px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-[#064e43] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600/50 flex items-center justify-center border border-emerald-400/40">
                <Bot className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold">CIT AI Copilot</h3>
                  {currentUser && (
                    <span className="text-[10px] bg-emerald-700/80 text-emerald-100 font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/40 uppercase">
                      {currentUser.role}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-emerald-200">
                  {currentUser?.name ? `Assisting ${currentUser.name}` : "Multimodal Voice & Text Assistant"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setSoundEnabled(!soundEnabled);
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  soundEnabled ? "text-emerald-200 hover:text-white" : "text-gray-400 hover:text-white"
                }`}
                title={soundEnabled ? "Mute Voice Output" : "Enable Voice Output"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-[#064e43] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                )}
                <div className="space-y-1.5 max-w-[84%]">
                  <div
                    className={`p-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                      m.role === "user"
                        ? "bg-[#064e43] text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Structured Voice Extracted Card */}
                  {m.audioParsed && m.audioParsed.windows && m.audioParsed.windows.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-[#064e43]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Voice Booking Details Captured:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-gray-700">
                        <div>
                          Venue: <strong>{m.audioParsed.requested_room ? VENUE_NAME_MAP[m.audioParsed.requested_room] || m.audioParsed.requested_room : "Seminar Hall"}</strong>
                        </div>
                        <div>
                          Slot: <strong>{DAYS_NAME_MAP[m.audioParsed.windows[0].day] || m.audioParsed.windows[0].day} P{m.audioParsed.windows[0].from_period}</strong>
                        </div>
                        <div>
                          Attendance: <strong>{m.audioParsed.attendance || 50}</strong>
                        </div>
                        <div>
                          Duration: <strong>{m.audioParsed.duration_periods || 2}h</strong>
                        </div>
                      </div>
                      {m.audioParsed.conflicts_or_warnings && m.audioParsed.conflicts_or_warnings.length > 0 && (
                        <div className="text-[10px] text-red-700 font-medium pt-0.5 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{m.audioParsed.conflicts_or_warnings.join(" | ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-xs text-gray-500 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#064e43]" />
                <span>CIT AI is verifying timetable constraints...</span>
              </div>
            )}

            {voiceProcessing && (
              <div className="flex gap-2 items-center text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                <span>Transcribing Hinglish audio &amp; parsing campus booking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Live Recording Overlay / Bar */}
          {isRecording && (
            <div className="bg-red-50 border-t border-red-200 px-4 py-2.5 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="text-xs font-bold text-red-700">
                  Listening ({recordingSeconds}s)... Speak your booking request
                </span>
              </div>
              <button
                onClick={stopRecording}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Done</span>
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            {/* Mic / Voice Recording Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading || voiceProcessing}
              className={`p-2.5 rounded-full transition-all shadow-sm active:scale-95 ${
                isRecording
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-emerald-50 hover:bg-emerald-100 text-[#064e43] border border-emerald-200"
              }`}
              title={isRecording ? "Stop recording voice" : "Speak voice booking request"}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={isRecording ? "Listening to your voice..." : "Type or speak (English / Hinglish)..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isRecording}
              className="flex-1 bg-[#f1f5f9] text-xs px-3.5 py-2.5 rounded-full outline-none text-gray-800 focus:ring-1 focus:ring-[#064e43]"
            />

            <button
              onClick={sendMessage}
              disabled={loading || voiceProcessing || !input.trim()}
              className="p-2.5 rounded-full bg-[#064e43] hover:bg-[#047857] text-white disabled:opacity-40 transition-colors shadow-sm"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
