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
 * Menu message handler.
 */
export const messages = {
  'toggle-panel'(): void {
    // The menu click will open/close the panel automatically via contributions
    console.log('[Claude Assistant] Toggle panel requested');
  },
};
