/**
 * Claude Assistant — Cocos Creator Editor Extension
 *
 * Provides a dockable panel for AI-assisted development.
 */

interface PanelThis {
  __claudePanelInit: boolean;
}

/**
 * Extension load entry.
 * Called when the extension is activated in the editor.
 */
export function load(): void {
  console.log('[Claude Assistant] Extension loaded');
}

/**
 * Extension unload entry.
 * Called when the extension is deactivated.
 */
export function unload(): void {
  console.log('[Claude Assistant] Extension unloaded');
}

/**
 * Panel open hook. Called each time the panel is opened.
 */
export function open(this: PanelThis): void {
  if (!this.__claudePanelInit) {
    this.__claudePanelInit = true;
    console.log('[Claude Assistant] Panel opened');
  }
}

/**
 * Message/method handlers for IPC from menu and other extension points.
 * Cocos Creator 3.x uses `messages` for menu items.
 */
export const messages = {
  'toggle-panel'(): void {
    console.log('[Claude Assistant] Toggle panel requested via messages');
    // Editor.Panel.open('claude-assistant.default');
  },
};

export const methods = {
  'toggle-panel'(): void {
    console.log('[Claude Assistant] Toggle panel requested via methods');
  },
};
