import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "processing";

const TARGET_SAMPLE_RATE = 16000;

function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.round(i * ratio);
    result[i] = buffer[Math.min(idx, buffer.length - 1)];
  }
  return result;
}

function float32ToBase64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;

    // Use default system sample rate, don't force 48000
    const ctx = new AudioContext();
    contextRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    chunksRef.current = [];

    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      chunksRef.current.push(new Float32Array(data));
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    setState("recording");
  }, []);

  const stop = useCallback((): { samplesBase64: string; sampleRate: number } => {
    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const inputRate = contextRef.current?.sampleRate ?? 48000;

    // Close audio context
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }

    // Merge chunks
    const totalLength = chunksRef.current.reduce((a, c) => a + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    chunksRef.current = [];

    // Downsample to 16kHz
    const samples = downsampleBuffer(merged, inputRate, TARGET_SAMPLE_RATE);

    // Encode as base64 for efficient transfer to Rust
    const samplesBase64 = float32ToBase64(samples);

    setState("idle");
    return { samplesBase64, sampleRate: TARGET_SAMPLE_RATE };
  }, []);

  return { state, setState, start, stop };
}
