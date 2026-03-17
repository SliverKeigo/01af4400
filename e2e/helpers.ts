import { Page } from "@playwright/test";

// In-memory task store that mirrors Rust backend behavior
const MOCK_SCRIPT = `
(function() {
  if (window.__tauriMocked) return;
  window.__tauriMocked = true;

  const tasks = [];
  let idCounter = 1;

  function generateId() { return 'test-task-' + (idCounter++); }
  function now() { return new Date().toISOString(); }

  window.__TAURI_INTERNALS__ = {
    invoke: function(cmd, args) {
      return new Promise((resolve, reject) => {
        switch (cmd) {
          case 'create_task': {
            const { title, text, language } = args;
            const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) { reject('文本不能为空'); return; }
            const task = {
              id: generateId(),
              title: title && title.trim() ? title.trim() : null,
              language: language,
              items: lines.map(l => ({ original_text: l, attempts: [] })),
              created_at: now()
            };
            tasks.push(task);
            resolve(JSON.parse(JSON.stringify(task)));
            break;
          }
          case 'list_tasks':
            resolve(JSON.parse(JSON.stringify(tasks)));
            break;
          case 'get_task': {
            const t = tasks.find(t => t.id === args.taskId);
            if (!t) { reject('任务不存在'); return; }
            resolve(JSON.parse(JSON.stringify(t)));
            break;
          }
          case 'delete_task': {
            const idx = tasks.findIndex(t => t.id === args.taskId);
            if (idx === -1) { reject('任务不存在'); return; }
            tasks.splice(idx, 1);
            resolve(null);
            break;
          }
          case 'save_attempt': {
            const task = tasks.find(t => t.id === args.taskId);
            if (!task) { reject('任务不存在'); return; }
            const item = task.items[args.itemIndex];
            if (!item) { reject('句子索引越界'); return; }
            if (item.attempts.length >= 2) { reject('已达到最大识别记录数（2条），请先删除再录'); return; }
            item.attempts.push({ text: args.recognizedText, timestamp: now() });
            resolve(JSON.parse(JSON.stringify(task)));
            break;
          }
          case 'delete_attempt': {
            const task2 = tasks.find(t => t.id === args.taskId);
            if (!task2) { reject('任务不存在'); return; }
            const item2 = task2.items[args.itemIndex];
            if (!item2) { reject('句子索引越界'); return; }
            if (args.attemptIndex >= item2.attempts.length) { reject('记录索引越界'); return; }
            item2.attempts.splice(args.attemptIndex, 1);
            resolve(JSON.parse(JSON.stringify(task2)));
            break;
          }
          case 'recognize_audio':
            resolve('mock识别结果文本');
            break;
          case 'get_model_status':
            resolve(true);
            break;
          case 'load_model':
            resolve(null);
            break;
          default:
            reject('Unknown command: ' + cmd);
        }
      });
    },
    convertFileSrc: function() { return ''; }
  };
})();
`;

export async function mockTauri(page: Page) {
  await page.addInitScript(MOCK_SCRIPT);
}

export async function fillInput(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
      if (!el) throw new Error("Element not found: " + sel);
      const setter =
        el instanceof HTMLTextAreaElement
          ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!
          : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    { sel: selector, val: value }
  );
}
