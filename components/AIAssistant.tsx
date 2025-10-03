
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    GoogleGenAI,
    LiveSession,
    LiveServerMessage,
    Modality,
    FunctionDeclaration,
    Type,
    FunctionCall,
    FunctionResponse,
    Blob as GenAI_Blob,
} from '@google/genai';
import { QueueSystemState, EmployeeStatus } from '../types';
import { Card } from './shared/Card';
import { Button } from './shared/Button';

// --- Audio Utility Functions ---
// These functions are implemented manually as per the guidelines.
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
function createBlob(data: Float32Array): GenAI_Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
// --- End Audio Utility Functions ---

const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'getSystemOverview',
        description: 'الحصول على نظرة عامة على حالة النظام الحالية، بما في ذلك عدد العملاء المنتظرين والموظفين المتاحين والشبابيك المشغولة.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'getWaitingCount',
        description: 'الحصول على العدد الدقيق للعملاء في طابور الانتظار حاليًا.',
        parameters: { type: Type.OBJECT, properties: {} },
    }
];

const ConnectionStatus = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR',
};

const AIAssistant: React.FC<{ state: QueueSystemState }> = ({ state }) => {
    const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
    const [transcripts, setTranscripts] = useState<{ user: string, ai: string }[]>([]);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const userTranscriptRef = useRef('');
    const modelTranscriptRef = useRef('');
    
    // --- Refs for audio playback queue ---
    const audioQueue = useRef<AudioBuffer[]>([]);
    const isPlaying = useRef(false);
    const nextStartTime = useRef(0);
    const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

    const playAudioQueue = useCallback(() => {
        if (isPlaying.current || audioQueue.current.length === 0 || !outputAudioContextRef.current) return;
        
        isPlaying.current = true;
        const audioCtx = outputAudioContextRef.current;
        const audioBuffer = audioQueue.current.shift()!;

        nextStartTime.current = Math.max(nextStartTime.current, audioCtx.currentTime);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
            audioSources.current.delete(source);
            isPlaying.current = false;
            playAudioQueue(); // Play next in queue
        };
        
        source.start(nextStartTime.current);
        nextStartTime.current += audioBuffer.duration;
        audioSources.current.add(source);

    }, []);

    const handleToolCall = useCallback((fc: FunctionCall): FunctionResponse => {
        let result: string;
        switch (fc.name) {
            case 'getSystemOverview': {
                const waiting = state.queue.length;
                const availableEmployees = state.employees.filter(e => e.status === EmployeeStatus.Available).length;
                const totalEmployees = state.employees.length;
                const busyWindows = state.windows.filter(w => w.currentCustomerId).length;
                result = `يوجد حاليًا ${waiting} عميل في الانتظار. ${availableEmployees} من أصل ${totalEmployees} موظفين متاحون للخدمة. ويتم خدمة العملاء في ${busyWindows} شباك.`;
                break;
            }
            case 'getWaitingCount': {
                result = `عدد العملاء في الانتظار هو ${state.queue.length}.`;
                break;
            }
            default:
                result = `Function ${fc.name} not found.`;
        }
        return { id: fc.id, name: fc.name, response: { result } };
    }, [state]);

    const startSession = async () => {
        setStatus(ConnectionStatus.CONNECTING);
        setTranscripts([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });
            microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus(ConnectionStatus.CONNECTED);
                        
                        // Stream audio from microphone
                        const source = inputAudioContextRef.current!.createMediaStreamSource(microphoneStreamRef.current!);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        scriptProcessorRef.current = scriptProcessor;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle tool calls
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                const toolResponse = handleToolCall(fc);
                                sessionPromiseRef.current?.then(session => {
                                    session.sendToolResponse({ functionResponses: toolResponse });
                                });
                            }
                        }

                        // Handle audio output
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                           const decodedBytes = decode(audioData);
                           const audioBuffer = await decodeAudioData(decodedBytes, outputAudioContextRef.current!, 24000, 1);
                           audioQueue.current.push(audioBuffer);
                           playAudioQueue();
                        }
                        
                         // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            userTranscriptRef.current += message.serverContent.inputTranscription.text;
                        }
                         if (message.serverContent?.outputTranscription) {
                            modelTranscriptRef.current += message.serverContent.outputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const finalUser = userTranscriptRef.current.trim();
                            const finalModel = modelTranscriptRef.current.trim();
                            if(finalUser || finalModel) {
                                setTranscripts(prev => [...prev, { user: finalUser, ai: finalModel }]);
                            }
                            userTranscriptRef.current = '';
                            modelTranscriptRef.current = '';
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setStatus(ConnectionStatus.ERROR);
                        closeSession();
                    },
                    onclose: (e: CloseEvent) => {
                        closeSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: [{ functionDeclarations: toolDeclarations }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: 'أنت مساعد ذكي لموظف في نظام إدارة الطوابير. مهمتك هي الإجابة على أسئلته حول حالة النظام باستخدام الأدوات المتاحة لك. كن موجزًا ومباشرًا في إجاباتك.',
                }
            });

        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus(ConnectionStatus.ERROR);
        }
    };

    const closeSession = useCallback(() => {
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        
        audioSources.current.forEach(source => source.stop());
        audioSources.current.clear();
        audioQueue.current = [];
        isPlaying.current = false;
        nextStartTime.current = 0;

        setStatus(ConnectionStatus.DISCONNECTED);
    }, []);

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            closeSession();
        };
    }, [closeSession]);
    
    const toggleSession = () => {
        if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
            closeSession();
        } else {
            startSession();
        }
    };

    const getStatusIndicator = () => {
        switch (status) {
            case ConnectionStatus.CONNECTED:
                return { text: 'متصل', color: 'bg-green-500', pulse: true };
            case ConnectionStatus.CONNECTING:
                return { text: 'جاري الاتصال...', color: 'bg-yellow-500', pulse: true };
            case ConnectionStatus.ERROR:
                return { text: 'خطأ', color: 'bg-red-500', pulse: false };
            case ConnectionStatus.DISCONNECTED:
            default:
                return { text: 'غير متصل', color: 'bg-slate-500', pulse: false };
        }
    };

    const { text, color, pulse } = getStatusIndicator();

    return (
        <Card className="bg-slate-800 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">المساعد الذكي</h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}></div>
                    <span className="text-slate-400 text-sm">{text}</span>
                </div>
            </div>
            <p className="text-slate-400 mb-4">تحدث مع الذكاء الاصطناعي للحصول على معلومات سريعة عن حالة النظام. اسأل مثلاً: "ما هي حالة النظام؟"</p>
            <Button 
                onClick={toggleSession} 
                className="w-full"
                variant={status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING ? 'danger' : 'primary'}
            >
                {status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING ? 'إنهاء المحادثة' : 'بدء المحادثة'}
            </Button>
            
            {transcripts.length > 0 && (
                <div className="mt-4 space-y-2 bg-slate-900/50 p-3 rounded-md max-h-40 overflow-y-auto">
                    {transcripts.map((t, index) => (
                        <div key={index}>
                           {t.user && <p><span className="font-semibold text-sky-400">أنت:</span> {t.user}</p>}
                           {t.ai && <p><span className="font-semibold text-yellow-400">المساعد:</span> {t.ai}</p>}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default AIAssistant;
