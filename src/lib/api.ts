import { invoke } from "@tauri-apps/api/core";
import type { Language, Task } from "./types";

export async function createTask(
  title: string,
  text: string,
  language: Language
): Promise<Task> {
  return invoke("create_task", { title, text, language });
}

export async function listTasks(): Promise<Task[]> {
  return invoke("list_tasks");
}

export async function getTask(taskId: string): Promise<Task> {
  return invoke("get_task", { taskId });
}

export async function deleteTask(taskId: string): Promise<void> {
  return invoke("delete_task", { taskId });
}

export async function saveAttempt(
  taskId: string,
  itemIndex: number,
  recognizedText: string
): Promise<Task> {
  return invoke("save_attempt", { taskId, itemIndex, recognizedText });
}

export async function deleteAttempt(
  taskId: string,
  itemIndex: number,
  attemptIndex: number
): Promise<Task> {
  return invoke("delete_attempt", { taskId, itemIndex, attemptIndex });
}

export async function recognizeAudio(
  audioSamples: number[],
  sampleRate: number,
  language: Language
): Promise<string> {
  return invoke("recognize_audio", { audioSamples, sampleRate, language });
}

export async function getModelStatus(): Promise<boolean> {
  return invoke("get_model_status");
}

export async function loadModel(modelDir: string): Promise<void> {
  return invoke("load_model", { modelDir });
}
