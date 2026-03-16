import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "processing";

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
      },
    });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setState("recording");
  }, []);

  const stop = useCallback((): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorder.current;
      if (!recorder) {
        reject(new Error("No recorder"));
        return;
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType });
        // Stop all tracks
        recorder.stream.getTracks().forEach((t) => t.stop());
        // Convert to ArrayBuffer for sending to Rust
        const buffer = await blob.arrayBuffer();
        setState("idle");
        resolve(buffer);
      };
      recorder.stop();
    });
  }, []);

  return { state, setState, start, stop };
}
