import { _decorator, Component, Label, EditBox, Node, ScrollView, Prefab, instantiate } from 'cc';
import { AIClient, ChatMessage } from './AIClient';

const { ccclass, property } = _decorator;

/**
 * Attach this component to a Node to add AI chat functionality.
 *
 * Usage from other scripts:
 *   const chatComp = this.node.getComponent(AIChatComponent);
 *   chatComp.sendMessage("Explain the rules of baseball");
 */
@ccclass('AIChatComponent')
export class AIChatComponent extends Component {
  @property({ type: Label, tooltip: 'Label to display AI response' })
  responseLabel: Label | null = null;

  @property({ type: EditBox, tooltip: 'EditBox for user input (optional)' })
  inputBox: EditBox | null = null;

  @property({ type: Node, tooltip: 'Loading indicator shown while waiting (optional)' })
  loadingIndicator: Node | null = null;

  @property({ type: Label, tooltip: 'Status label for errors/state (optional)' })
  statusLabel: Label | null = null;

  private _client: AIClient;
  private _history: ChatMessage[] = [];
  private _isLoading: boolean = false;

  onLoad(): void {
    this._client = AIClient.instance;
  }

  start(): void {
    if (this.loadingIndicator) {
      this.loadingIndicator.active = false;
    }
  }

  /** Send a message to Claude and display the response */
  async sendMessage(userText: string): Promise<void> {
    if (this._isLoading || !userText.trim()) return;

    this._isLoading = true;
    this.showLoading(true);

    // Add user message to history
    this._history.push({ role: 'user', content: userText });

    // Display user message
    this.displayStatus(`You: ${userText}`);

    try {
      const response = await this._client.chatStream(this._history, {
        onChunk: (text) => {
          // Streamed update — append to label
          if (this.responseLabel) {
            this.responseLabel.string += text;
          }
        },
        onDone: (fullText) => {
          this._history.push({ role: 'assistant', content: fullText });
        },
        onError: (error) => {
          this.displayStatus(`Error: ${error}`);
        },
      });

      if (this.responseLabel) {
        this.responseLabel.string = response;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.displayStatus(`Error: ${msg}`);
      console.error('[AIChatComponent]', msg);
    } finally {
      this._isLoading = false;
      this.showLoading(false);
    }
  }

  /** Send message from EditBox input */
  onSendButtonClicked(): void {
    if (!this.inputBox) return;
    const text = this.inputBox.string.trim();
    if (text) {
      this.sendMessage(text);
      this.inputBox.string = '';
    }
  }

  /** Clear chat history */
  clearHistory(): void {
    this._history = [];
    if (this.responseLabel) {
      this.responseLabel.string = '';
    }
    if (this.statusLabel) {
      this.statusLabel.string = '';
    }
  }

  /** Override the AI system prompt */
  setSystemPrompt(prompt: string): void {
    this._client.setSystemPrompt(prompt);
  }

  private showLoading(visible: boolean): void {
    if (this.loadingIndicator) {
      this.loadingIndicator.active = visible;
    }
  }

  private displayStatus(text: string): void {
    if (this.statusLabel) {
      this.statusLabel.string = text;
    }
  }
}
