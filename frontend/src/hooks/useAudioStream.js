import { useState, useRef, useCallback } from 'react';

export const useAudioStream = (wsUrl) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isAnswering, setIsAnswering] = useState(false); 
    
    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);
    const processorRef = useRef(null);
    const isAnsweringRef = useRef(false);
    
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);

    const playNextAudio = () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            return;
        }
        isPlayingRef.current = true;
        const audioBuffer = audioQueueRef.current.shift();
        const source = audioContextRef.current.createBufferSource();
        
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = playNextAudio; 
        source.start();
    };

    const connect = useCallback(async () => {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.binaryType = "arraybuffer";

        wsRef.current.onopen = () => setIsConnected(true);
        wsRef.current.onclose = () => setIsConnected(false);

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000, 
        });

        wsRef.current.onmessage = async (event) => {
            if (typeof event.data === "string") return; 

            const rawData = new Int16Array(event.data);
            const float32Data = new Float32Array(rawData.length);
            for (let i = 0; i < rawData.length; i++) {
                float32Data[i] = rawData[i] / 32768.0;
            }

            const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
            audioBuffer.getChannelData(0).set(float32Data);

            audioQueueRef.current.push(audioBuffer);
            if (!isPlayingRef.current) {
                playNextAudio();
            }
        };

        // Open microphone and continuously stream raw PCM bytes to the backend
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true } 
            });
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);

            processorRef.current.onaudioprocess = (e) => {
                if (wsRef.current?.readyState === WebSocket.OPEN && isAnsweringRef.current) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        let s = Math.max(-1, Math.min(1, inputData[i]));
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    wsRef.current.send(pcm16.buffer); 
                }
            };
        } catch (error) {
            console.error("Microphone access denied.", error);
        }
    }, [wsUrl]);

    const startAnswering = useCallback(() => {
        isAnsweringRef.current = true;
        setIsAnswering(true);
    }, []);

    const stopAnswering = useCallback(() => {
        isAnsweringRef.current = false;
        setIsAnswering(false);
        
        // Allow the final raw chunks to upload, then trigger the Whisper engine in the backend
        setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "audio_end" }));
            }
        }, 500);
    }, []);

    const disconnect = useCallback(() => {
        if (wsRef.current) wsRef.current.close();
        if (processorRef.current) processorRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        setIsConnected(false);
        setIsAnswering(false);
        isAnsweringRef.current = false;
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    }, []);

    return { isConnected, isAnswering, connect, disconnect, startAnswering, stopAnswering };
};