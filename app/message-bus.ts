/* eslint-disable prefer-const */
import { Intent } from '@blueprintjs/core';
import { Events } from './events';

// eslint-disable-next-line import/no-mutable-exports
export let bus = {};

export function init(mainWindow) {
  bus.message = (message, intent: Intent = Intent.PRIMARY) =>
    mainWindow.webContents.send(Events.Message, { intent, message });
  bus.progress = (message, pct) =>
    mainWindow.webContents.send(Events.Progress, { message, pct });
}
