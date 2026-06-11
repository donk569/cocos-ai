"use strict";
// Claude Assistant Panel — editor webview logic
const PROXY_URL = 'http://localhost:3099';
class ClaudePanel {
    constructor() {
        this.history = [];
        this.isLoading = false;
        this.messagesEl = document.getElementById('messages');
        this.inputEl = document.getElementById('user-input');
        this.sendBtn = document.getElementById('btn-send');
        this.clearBtn = document.getElementById('btn-clear');
        this.statusEl = document.getElementById('status');
        this.systemInput = document.getElementById('system-prompt');
        this.bindEvents();
    }
    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    async sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text || this.isLoading)
            return;
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
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
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
                            }
                            else if (parsed.type === 'done') {
                                fullText = parsed.text;
                                assistantMsgEl.innerHTML = this.renderMarkdown(fullText);
                                this.history.push({ role: 'assistant', content: fullText });
                            }
                            else if (parsed.type === 'error') {
                                this.setStatus(`Error: ${parsed.error}`);
                                assistantMsgEl.classList.add('error');
                                assistantMsgEl.textContent = `Error: ${parsed.error}`;
                            }
                        }
                        catch {
                            // Partial line, ignore
                        }
                    }
                }
            }
            this.setStatus('');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            assistantMsgEl.classList.add('error');
            assistantMsgEl.textContent = `Error: ${msg}`;
            this.setStatus(`Error: ${msg}`);
        }
        finally {
            this.isLoading = false;
            this.sendBtn.disabled = false;
        }
    }
    appendMessage(role, content) {
        const el = document.createElement('div');
        el.className = `msg ${role}`;
        if (role === 'assistant') {
            el.innerHTML = this.renderMarkdown(content);
        }
        else {
            el.textContent = content;
        }
        this.messagesEl.appendChild(el);
        this.scrollToBottom();
        return el;
    }
    clearChat() {
        this.history = [];
        this.messagesEl.innerHTML = '';
        this.setStatus('');
    }
    setStatus(text) {
        this.statusEl.textContent = text;
    }
    /**
     * Simple markdown-like rendering for code blocks and inline code.
     */
    renderMarkdown(text) {
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
    scrollToBottom() {
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
