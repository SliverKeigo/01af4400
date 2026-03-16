export type Language =
  | "chinese"
  | "english"
  | "japanese"
  | "korean"
  | "cantonese";

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "chinese", label: "中文" },
  { value: "english", label: "English" },
  { value: "japanese", label: "日本語" },
  { value: "korean", label: "한국어" },
  { value: "cantonese", label: "粤语" },
];

export interface Attempt {
  text: string;
  timestamp: string;
}

export interface TaskItem {
  original_text: string;
  attempts: Attempt[];
}

export interface Task {
  id: string;
  title: string | null;
  language: Language;
  items: TaskItem[];
  created_at: string;
}
