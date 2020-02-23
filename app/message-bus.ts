/* eslint-disable prefer-const */
import { Events } from './events';

// eslint-disable-next-line import/no-mutable-exports
export let bus = {};

export function init(mainWindow) {
  bus.message = (message, type = 'log') =>
    mainWindow.webContents.send(Events.Message, { type, message });
  bus.progress = (message, pct) =>
    mainWindow.webContents.send(Events.Progress, { message, pct });
}
