import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

const src = readFileSync(new URL('./ipc-guard.cjs', import.meta.url), 'utf-8');

function loadGuard() {
  const handlers: Record<string, (event: unknown, ...args: unknown[]) => unknown> = {};
  const ipcMain = { handle(channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) { handlers[channel] = fn; } };
  new Function('require', src)(() => ({ ipcMain }));
  const echo = (_e: unknown, arg: unknown) => ({ ran: arg });
  for (const ch of ['run-shell-command', 'start-tor-log', 'get-log-file-metadata', 'get-tor-status']) ipcMain.handle(ch, echo);
  return (channel: string, arg?: unknown) => handlers[channel]({}, arg) as { ran?: unknown };
}

const call = loadGuard();
const runs = (cmd: string) => call('run-shell-command', cmd).ran === cmd;

test('allows the commands the site uses', () => {
  assert.ok(runs('chcp 437 > NUL && tasklist /FI "IMAGENAME eq torchlight_infinite.exe" /FO LIST'));
  assert.ok(runs('powershell -Command "(Get-Process -Id 1234).Path"'));
  assert.ok(runs(`powershell -NoProfile -Command "(Get-Process -Id 1234).StartTime.ToUniversalTime().ToString('o')"`));
  assert.ok(runs('powershell -NoLogo -NoProfile -NonInteractive -Command "$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=New-Object Security.Principal.WindowsPrincipal($identity);[Console]::Write($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"'));
});

test('blocks everything else', () => {
  for (const cmd of [
    'calc.exe',
    'chcp 437 > NUL && tasklist /FI "IMAGENAME eq x.exe" /FO LIST & calc',
    'powershell -Command "(Get-Process -Id 1;calc).Path"',
    'start "" "https://example.com"',
    'powershell -EncodedCommand SQBFAFgA',
  ]) assert.equal(call('run-shell-command', cmd).ran, undefined, cmd);
  assert.equal(call('run-shell-command', ['calc']).ran, undefined);
});

test('log channels only reach the game log', () => {
  const ok = { logPath: 'D:\\Steam\\Torchlight Infinite\\UE_game\\TorchLight\\Saved\\Logs\\UE_game.log' };
  assert.equal(call('start-tor-log', ok).ran, ok);
  assert.ok(call('get-log-file-metadata', {}).ran);
  for (const logPath of ['C:\\Users\\me\\.ssh\\id_rsa', 'C:\\x\\UE_game.log.bak', 'C:\\secret.txt:UE_game.log', 'C:\\x\\UE_game.log.']) {
    assert.equal(call('start-tor-log', { logPath }).ran, undefined, logPath);
  }
  assert.deepEqual(call('get-tor-status', 1), { ran: 1 });
});
