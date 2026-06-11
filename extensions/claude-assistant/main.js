"use strict";
/**
 * Claude Assistant — Cocos Creator Editor Extension
 *
 * Provides a dockable panel for AI-assisted development.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = void 0;
exports.load = load;
exports.unload = unload;
exports.open = open;
/**
 * Extension load entry.
 * Called when the extension is activated in the editor.
 */
function load() {
    console.log('[Claude Assistant] Extension loaded');
}
/**
 * Extension unload entry.
 * Called when the extension is deactivated.
 */
function unload() {
    console.log('[Claude Assistant] Extension unloaded');
}
/**
 * Panel open hook. Called each time the panel is opened.
 */
function open() {
    if (!this.__claudePanelInit) {
        this.__claudePanelInit = true;
        console.log('[Claude Assistant] Panel opened');
    }
}
/**
 * Menu message handler.
 */
exports.messages = {
    'toggle-panel'() {
        // The menu click will open/close the panel automatically via contributions
        console.log('[Claude Assistant] Toggle panel requested');
    },
};
