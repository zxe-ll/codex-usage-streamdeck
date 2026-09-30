import streamDeck, { action, SingletonAction, type WillAppearEvent, type WillDisappearEvent } from '@elgato/streamdeck';
import { getCodexUsage } from './usage/codexUsage.ts';
import { usageFeedback, statusFeedback } from './infobar/renderer.ts';

@action({ UUID: 'com.ayato.codexusage.infobar' })
class CodexInfobar extends SingletonAction {
  private active = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private failures = 0;
  private feedback: ReturnType<typeof usageFeedback> | ReturnType<typeof statusFeedback> = statusFeedback('LOADING');

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    if (!ev.action.isNeoInfobar()) return;
    await ev.action.setFeedbackLayout('layouts/usage.json');
    await ev.action.setFeedback(this.feedback);
    this.active.add(ev.action.id);
    if (!this.timer && !this.running) void this.poll();
  }
  override onWillDisappear(ev: WillDisappearEvent): void {
    this.active.delete(ev.action.id);
    if (!this.active.size) { clearTimeout(this.timer); this.timer = undefined; }
  }
  private async poll(): Promise<void> {
    if (this.running || !this.active.size) return;
    this.running = true;
    this.timer = undefined;
    try {
      this.feedback = usageFeedback(await getCodexUsage());
      this.failures = 0;
    } catch (error) {
      this.failures++;
      const code = error instanceof Error ? error.message : '';
      this.feedback = statusFeedback(code === 'CODEX_LOGIN_REQUIRED' || code === 'CODEX_CHATGPT_AUTH_REQUIRED' ? 'LOGIN' : 'ERROR');
      // Fixed codes only; raw responses and server errors are never logged.
      const allowed = /^CODEX_[A-Z_]+$/.test(code) ? code : 'CODEX_UNKNOWN_ERROR';
      streamDeck.logger.warn(`Usage read failed: ${allowed}`);
    }
    for (const instance of this.actions) {
      if (this.active.has(instance.id) && instance.isNeoInfobar()) {
        try { await instance.setFeedback(this.feedback); }
        catch { streamDeck.logger.warn('Infobar feedback update failed'); }
      }
    }
    this.running = false;
    if (this.active.size) {
      const delay = this.failures ? Math.min(600000, 120000 * 2 ** Math.min(this.failures - 1, 3)) : 60000;
      this.timer = setTimeout(() => void this.poll(), delay);
    }
  }
}
streamDeck.actions.registerAction(new CodexInfobar());
streamDeck.connect();
