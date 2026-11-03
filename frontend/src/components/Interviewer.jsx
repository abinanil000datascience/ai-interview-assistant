import { useState, useEffect, useRef } from 'react';
import { useAudioStream } from '../hooks/useAudioStream';

export default function Interviewer() {
    const { isConnected, isAnswering, connect, disconnect, startAnswering, stopAnswering } = useAudioStream('ws://localhost:8000/ws/interview');
    
    const [userTranscript, setUserTranscript] = useState("");
    const recognitionRef = useRef(null);
    const isRecordingRef = useRef(false);
    const finalTranscriptRef = useRef("");

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const sr = new SpeechRecognition();
            
            sr.continuous = true;
            sr.interimResults = true;
            sr.lang = 'en-IN'; 
            
            sr.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setUserTranscript(finalTranscriptRef.current + interimTranscript);
            };
            
            sr.onend = () => {
                if (isRecordingRef.current) {
                    try { sr.start(); } catch (error) { console.log("Continuing..."); }
                }
            };
            
            sr.onerror = (e) => console.error("Speech Recognition Error:", e.error);
            recognitionRef.current = sr;
        } else {
            console.warn("Speech Recognition not supported in this browser.");
        }
    }, []);

    const handleStartAnswering = () => {
        finalTranscriptRef.current = "";
        setUserTranscript(""); 
        isRecordingRef.current = true;
        startAnswering();
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch(e) { console.log(e); }
        }
    };

    const handleStopAnswering = () => {
        isRecordingRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) { console.log(e); }
        }
        stopAnswering(userTranscript);
    };

    const getStatusColor = () => {
        if (!isConnected) return '#64748b'; 
        if (isAnswering) return '#3b82f6'; 
        return '#10b981'; 
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <style>
                {`
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(var(--rgb-color), 0.4); }
                    70% { box-shadow: 0 0 0 25px rgba(var(--rgb-color), 0); }
                    100% { box-shadow: 0 0 0 0 rgba(var(--rgb-color), 0); }
                }
                .action-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 600; letter-spacing: 0.3px; }
                .action-btn:hover { transform: translateY(-2px); filter: brightness(105%); }
                .action-btn:active { transform: translateY(0px); }
                `}
            </style>

            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                width: '100%',
                maxWidth: '700px',
                padding: '48px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '40px'
            }}>
                
                {/* Header */}
                <div>
                    <div style={{ 
                        display: 'inline-block', padding: '6px 12px', borderRadius: '20px', 
                        backgroundColor: isConnected ? '#ecfdf5' : '#f1f5f9', 
                        color: isConnected ? '#059669' : '#475569', 
                        fontSize: '13px', fontWeight: '600', marginBottom: '16px' 
                    }}>
                        {isConnected ? '🟢 Live Session Active' : '⚪ Waiting for Connection'}
                    </div>
                    <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '28px', letterSpacing: '-0.5px' }}>Technical Interview</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                        Ensure your microphone is active. Speak clearly when answering.
                    </p>
                </div>

                {/* Animated AI Orb */}
                <div style={{
                    margin: '0 auto',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'background-color 0.4s ease',
                    '--rgb-color': !isConnected ? '100, 116, 139' : (isAnswering ? '59, 130, 246' : '16, 185, 129'),
                    animation: isConnected ? 'pulse-ring 2s infinite cubic-bezier(0.4, 0, 0.6, 1)' : 'none'
                }}>
                    {!isConnected ? "Offline" : (isAnswering ? "Listening..." : "AI Speaking")}
                </div>
                
                {/* Control Panel */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!isConnected ? (
                        <button className="action-btn" onClick={connect} style={{ 
                            padding: '16px 40px', fontSize: '16px', cursor: 'pointer', 
                            backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            Initialize Session
                        </button>
                    ) : (
                        <>
                            {!isAnswering ? (
                                <button className="action-btn" onClick={handleStartAnswering} style={{ 
                                    padding: '16px 32px', fontSize: '16px', cursor: 'pointer', flex: 1,
                                    backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                                }}>
                                    🎤 Start Answering
                                </button>
                            ) : (
                                <button className="action-btn" onClick={handleStopAnswering} style={{ 
                                    padding: '16px 32px', fontSize: '16px', cursor: 'pointer', flex: 1,
                                    backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                                }}>
                                    ⏹ Done Speaking
                                </button>
                            )}
                            
                            <button className="action-btn" onClick={disconnect} style={{ 
                                padding: '16px 24px', fontSize: '16px', cursor: 'pointer', 
                                backgroundColor: '#ffffff', color: '#475569', border: '2px solid #e2e8f0', borderRadius: '12px' 
                            }}>
                                End
                            </button>
                        </>
                    )}
                </div>

                {/* Modern Transcription Box */}
                <div style={{
                    backgroundColor: isAnswering ? '#eff6ff' : '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: isAnswering ? '#bfdbfe' : '#e2e8f0',
                    padding: '24px',
                    textAlign: 'left',
                    minHeight: '140px',
                    transition: 'all 0.3s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isAnswering ? "#3b82f6" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M12 2c-1.7 0-3 1.2-3 2.8v5.4c0 1.6 1.3 2.8 3 2.8s3-1.2 3-2.8V4.8C15 3.2 13.7 2 12 2z"></path>
                                <path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
                                <line x1="12" y1="18" x2="12" y2="22"></line>
                            </svg>
                            <strong style={{ color: '#334155', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                Live Transcript
                            </strong>
                        </div>
                        {isAnswering && (
                            <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', animation: 'pulse 2s infinite' }}>Recording...</span>
                        )}
                    </div>
                    
                    <p style={{ 
                        margin: 0, 
                        color: userTranscript ? '#0f172a' : '#94a3b8', 
                        fontSize: '16px', 
                        lineHeight: '1.7',
                        fontStyle: userTranscript ? 'normal' : 'italic' 
                    }}>
                        {userTranscript || (isConnected 
                            ? (isAnswering ? "Listening to your voice..." : "Click 'Start Answering' when you are ready to speak.") 
                            : "Transcript will appear here once connected.")}
                    </p>
                </div>

            </div>
        </div>
    );
}