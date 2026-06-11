// Claude Assistant Panel — editor webview logic

const PROXY_URL = 'http://localhost:3099';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ClaudePanel {
  private messagesEl: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private statusEl: HTMLElement;
  private systemInput: HTMLInputElement;
  private history: ChatMessage[] = [];
  private isLoading = false;

  constructor() {
    this.messagesEl = document.getElementById('messages')!;
    this.inputEl = document.getElementById('user-input') as HTMLTextAreaElement;
    this.sendBtn = document.getElementById('btn-send') as HTMLButtonElement;
    this.clearBtn = document.getElementById('btn-clear') as HTMLButtonElement;
    this.statusEl = document.getElementById('status')!;
    this.systemInput = document.getElementById('system-prompt') as HTMLInputElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.clearBtn.addEventListener('click', () => this.clearChat());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  private async sendMessage(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.isLoading) return;

    this.isLoading = true;
    this.sendBtn.disabled = true;
    this.setStatus('Thinking...');

    this.history.push({ role: 'user', content: text });
    this.appendMessage('user', text);
    this.inputEl.value = '';

    const assistantMsgEl = this.appendMessage('assistant', '');
    let fullText = '';

    try {
      const response = await fetch(`${PROXY_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.history,
          system: this.systemInput.value || undefined,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.type === 'chunk') {
                fullText += parsed.text;
                assistantMsgEl.innerHTML = this.renderMarkdown(fullText);
              } else if (parsed.type === 'done') {
                fullText = parsed.text;
                assistantMsgEl.innerHTML = this.renderMarkdown(fullText);
                this.history.push({ role: 'assistant', content: fullText });
              } else if (parsed.type === 'error') {
                this.setStatus(`Error: ${parsed.error}`);
                assistantMsgEl.classList.add('error');
                assistantMsgEl.textContent = `Error: ${parsed.error}`;
              }
            } catch {
              // Partial line, ignore
            }
          }
        }
      }

      this.setStatus('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      assistantMsgEl.classList.add('error');
      assistantMsgEl.textContent = `Error: ${msg}`;
      this.setStatus(`Error: ${msg}`);
    } finally {
      this.isLoading = false;
      this.sendBtn.disabled = false;
    }
  }

  private appendMessage(role: 'user' | 'assistant' | 'error', content: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    if (role === 'assistant') {
      el.innerHTML = this.renderMarkdown(content);
    } else {
      el.textContent = content;
    }
    this.messagesEl.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  private clearChat(): void {
    this.history = [];
    this.messagesEl.innerHTML = '';
    this.setStatus('');
  }

  private setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  /**
   * Simple markdown-like rendering for code blocks and inline code.
   */
  private renderMarkdown(text: string): string {
    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks ```...```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre><code>${code}</code></pre>`;
    });

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **...**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  private scrollToBottom(): void {
    const area = document.getElementById('chat-area');
    if (area) {
      area.scrollTop = area.scrollHeight;
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new ClaudePanel();
});
