// Prepended to ETor's build/obf-app/main.js so it wraps ipcMain.handle before the app registers
// any handler. The UI is a remote website running as administrator; this is the trust boundary.
;(function (ipcMain) {
  // Only the exact command shapes the site uses for game process / log path discovery.
  const SHELL_ALLOWLIST = new RegExp('^(?:' + [
    'chcp\\s+\\d+\\s*>\\s*NUL\\s*&&\\s*tasklist\\s+/FI\\s+"IMAGENAME eq [\\w.-]+\\.exe"\\s+/FO\\s+LIST',
    'powershell\\s+-Command\\s+"\\(Get-Process\\s+-Id\\s+\\d+\\)\\.Path"',
    'powershell\\s+-NoProfile\\s+-Command\\s+"\\(Get-Process\\s+-Id\\s+\\d+\\)\\.StartTime\\.ToUniversalTime\\(\\)\\.ToString\\(\'o\'\\)"',
    'powershell -NoLogo -NoProfile -NonInteractive -Command "\\$identity=\\[Security\\.Principal\\.WindowsIdentity\\]::GetCurrent\\(\\);\\$principal=New-Object Security\\.Principal\\.WindowsPrincipal\\(\\$identity\\);\\[Console\\]::Write\\(\\$principal\\.IsInRole\\(\\[Security\\.Principal\\.WindowsBuiltInRole\\]::Administrator\\)\\)"',
  ].join('|') + ')$', 'i');

  // The site picks the file to tail and the filter rules, so keep it on the game log.
  const isGameLog = (p) => !p || /(?:^|[\\/])UE_game\.log$/i.test(String(p).trim());

  const shellBlocked = { stdout: '', stderr: 'Command not allowed', error: 'Forbidden', errorCode: 'forbidden', timedOut: false };
  const logBlocked = { success: false, supported: true, found: false, errorCode: 'log_path_not_allowed' };
  const logGuard = (opts) => (isGameLog(opts && opts.logPath) ? null : logBlocked);
  const guards = {
    'run-shell-command': (cmd) => (typeof cmd === 'string' && SHELL_ALLOWLIST.test(cmd) ? null : shellBlocked),
    'start-tor-log': logGuard,
    'restart-tor-log': logGuard,
    'scan-latest-player-identity': logGuard,
    'get-log-file-metadata': logGuard,
  };

  const handle = ipcMain.handle;
  ipcMain.handle = function (channel, listener) {
    const guard = guards[channel];
    if (!guard) return handle.call(this, channel, listener);
    return handle.call(this, channel, (event, ...args) => {
      const blocked = guard(...args);
      console.log('[ETOR-CF]', new Date().toISOString(), blocked ? 'BLOCKED' : 'ALLOWED', channel, args[0]);
      return blocked || listener(event, ...args);
    });
  };
  if (ipcMain.handle === handle) throw new Error('[ETOR-CF] failed to install IPC guard');
})(require('electron').ipcMain);
