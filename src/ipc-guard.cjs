// Prepended to ETor's build/obf-app/main.js so it wraps ipcMain.handle before the app registers
// any handler. The UI is a remote website running as administrator; this is the trust boundary.
;(function (ipcMain) {
  // Local drive-letter path to a UE_game.log. No UNC paths (Windows would send NTLM credentials to a
  // remote host), no alternate data streams, no characters PowerShell treats as single quotes.
  const isGameLog = (p) => /^[A-Za-z]:[\\/](?:[^\\/:*?"<>|\u0000-\u001f\u2018-\u201b]+[\\/])*UE_game\.log$/i.test(p);

  // Only the exact command shapes the site uses for game process / log path discovery.
  const SHELL_ALLOWLIST = new RegExp('^(?:' + [
    'chcp\\s+\\d+\\s*>\\s*NUL\\s*&&\\s*tasklist\\s+/FI\\s+"IMAGENAME eq [\\w.-]+\\.exe"\\s+/FO\\s+LIST',
    'powershell\\s+-Command\\s+"\\(Get-Process\\s+-Id\\s+\\d+\\)\\.Path"',
    'powershell\\s+-NoProfile\\s+-Command\\s+"\\(Get-Process\\s+-Id\\s+\\d+\\)\\.StartTime\\.ToUniversalTime\\(\\)\\.ToString\\(\'o\'\\)"',
    'powershell -NoLogo -NoProfile -NonInteractive -Command "\\$identity=\\[Security\\.Principal\\.WindowsIdentity\\]::GetCurrent\\(\\);\\$principal=New-Object Security\\.Principal\\.WindowsPrincipal\\(\\$identity\\);\\[Console\\]::Write\\(\\$principal\\.IsInRole\\(\\[Security\\.Principal\\.WindowsBuiltInRole\\]::Administrator\\)\\)"',
  ].join('|') + ')$', 'i');

  // The site's read-only log scanners (player identity, inventory recovery), verbatim from its bundle.
  // One runs only if it re-encodes byte-for-byte from these templates with a game-log path and integers.
  const identityScript = (p, n) => `$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.Encoding]::ASCII;$p='${p}';$n=${n};function w($v){[Console]::WriteLine([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($v|ConvertTo-Json -Compress -Depth 4))))};try{$f=[IO.FileInfo]::new($p);$h=[IO.FileStream]::new($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete));try{$l=[int64]$h.Length;$c=[int][Math]::Min([int64]$n,$l);$o=$l-$c;$h.Position=$o;$b=[byte[]]::new($c);$r=0;while($r -lt $c){$z=$h.Read($b,$r,$c-$r);if($z -le 0){break};$r+=$z}}finally{$h.Dispose()};$t=[Text.Encoding]::UTF8.GetString($b,0,$r);$k='(?:SendMessage|PushMessage|RecvMessage|RecvPushMsg)';$ss=[regex]::Matches($t,"(?i)$k\\s+STT-+GetPlayerData-+SynId\\s*=\\s*\\d*");$a=[regex]::new("(?i)$k\\s+STT-+[^\\r\\n]+-+SynId\\s*=\\s*\\d*");$e=[regex]::new("(?i)$k\\s+End[^\\r\\n]*");$x=$null;for($i=$ss.Count-1;$i -ge 0;$i-=1){$s=$ss[$i];$q=$t.LastIndexOf([char]10,$s.Index);if($q -lt 0){$q=0}else{$q+=1};$u=$t.Substring($q);$j=$s.Index-$q+$s.Length;$y=$e.Match($u,$j);if(-not $y.Success){continue};$z=$a.Match($u,$j);if($z.Success -and $z.Index -lt $y.Index){continue};$v=$u.Substring(0,$y.Index+$y.Length);$g={param($d)$m=[regex]::Match($v,'(?m)^[|+\\t ]*'+[regex]::Escape($d)+'\\s+\\[([^\\]]*)\\]');if($m.Success){$m.Groups[1].Value.Trim()}else{''}};$pi=& $g 'PlayerId';$si=& $g 'SeasonId';if(-not $pi -or -not $si){continue};$d=[regex]::Match($v,'\\[(\\d{4}\\.\\d{2}\\.\\d{2}-\\d{2}\\.\\d{2}\\.\\d{2}:\\d{1,3})\\]').Groups[1].Value;$x=[pscustomobject]@{UserId=(& $g 'UserId');PlayerId=$pi;SeasonId=$si;HeroId=(& $g 'HeroId');HeroPurchaseId=(& $g 'HeroPurchaseId');Name=(& $g 'Name');Level=(& $g 'Level');PlayerLevel=(& $g 'PlayerLevel');DeathCount=(& $g 'DeathCount');Exp=(& $g 'Exp');ActualActiveTime=(& $g 'ActualActiveTime');LogTimestamp=$d};break};$y=[ordered]@{supported=$true;found=($null -ne $x);reason=$(if($x){'found'}elseif($l -gt $n){'byte_limit_reached'}else{'not_found'});scannedBytes=$r;scanStartOffset=$o;fileSize=$l;fileBirthtime=$f.CreationTimeUtc.ToString('o');fileMtime=$f.LastWriteTimeUtc.ToString('o')};if($x){$y['player']=$x};w ([pscustomobject]$y)}catch{w ([pscustomobject]@{supported=$false;found=$false;reason='shell_scan_failed';errorCode=$_.Exception.GetType().Name})}`;
  const inventoryScript = (p, n, min) => `$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.Encoding]::ASCII;$p='${p}';$n=${n};$min=${min};function w($v){[Console]::WriteLine([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($v|ConvertTo-Json -Compress -Depth 5))))};try{$f=[IO.FileInfo]::new($p);$h=[IO.FileStream]::new($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete));try{$l=[int64]$h.Length;$c=[int][Math]::Min([int64]$n,$l);$o=$l-$c;$h.Position=$o;$b=[byte[]]::new($c);$r=0;while($r -lt $c){$z=$h.Read($b,$r,$c-$r);if($z -le 0){break};$r+=$z}}finally{$h.Dispose()};$t=[Text.Encoding]::UTF8.GetString($b,0,$r);$rx=[regex]::new('(?is)ItemChange@\\s+ProtoName=ResetItemsLayout\\s+start1?.*?ItemChange@\\s+ProtoName=ResetItemsLayout\\s+end1?');$bs=$rx.Matches($t);$ir=[regex]::new('(?i)ItemChange@\\s+(?:Delete|Update|Add)\\s+Id=(\\d+_[^\\s]+)\\s+(?:BagNum=)?([^\\s]*)\\s*in\\s+PageId=(-?\\d+)\\s+SlotId=(\\d+)');$pg=@();foreach($pid in @(102,103)){$v=$null;for($i=$bs.Count-1;$i -ge 0;$i--){$bl=$bs[$i];$ab=$o+$bl.Index;if($ab -lt $min){continue};$rm=[regex]::Match($bl.Value,"(?i)\\[(\\d{4}\\.\\d{2}\\.\\d{2}-\\d{2}\\.\\d{2}\\.\\d{2}:\\d{1,3})\\].*ItemChange@\\s+Reset\\s+PageId=$pid");if(!$rm.Success){continue};$it=@();foreach($m in $ir.Matches($bl.Value)){if([int]$m.Groups[3].Value -ne $pid){continue};$id=$m.Groups[1].Value;$ba=$id.Split('_')[0];if($ba -eq '100200'){continue};$qu=0;if($m.Groups[2].Value){$qu=[double]$m.Groups[2].Value};$it+=[pscustomobject]@{i=$id;b=$ba;q=$qu;p=$pid;s=[int]$m.Groups[4].Value}};$v=[pscustomobject]@{p=$pid;t=$rm.Groups[1].Value;o=$o+$bl.Index+$rm.Index;i=$it};break};if($v){$pg+=$v}};$y=[ordered]@{supported=$true;found=($pg.Count -eq 2);reason=$(if($pg.Count -eq 2){'found'}else{'incomplete_inventory'});scannedBytes=$r;scanStartOffset=$o;fileSize=$l;fileBirthtime=$f.CreationTimeUtc.ToString('o');fileMtime=$f.LastWriteTimeUtc.ToString('o');pages=$pg};w ([pscustomobject]$y)}catch{w ([pscustomobject]@{supported=$false;found=$false;reason='inventory_shell_scan_failed';errorCode=$_.Exception.GetType().Name})}`;
  const PS = 'powershell -NoLogo -NoProfile -NonInteractive -EncodedCommand ';
  const PARAMS = /^\$ErrorActionPreference='Stop';\[Console\]::OutputEncoding=\[Text\.Encoding\]::ASCII;\$p='((?:[^']|'')*)';\$n=(\d{1,9});(?:\$min=(\d{1,15});)?/;
  const encode = (script) => PS + Buffer.from(script, 'utf16le').toString('base64').replace(/wmic/gi, (m) => `${m[0]}"${m[1]}"${m.slice(2)}`);
  const isLogScan = (cmd) => {
    if (!cmd.startsWith(PS)) return false;
    const m = PARAMS.exec(Buffer.from(cmd.slice(PS.length).replace(/"/g, ''), 'base64').toString('utf16le'));
    if (!m || !isGameLog(m[1].replace(/''/g, "'"))) return false;
    return cmd === encode(m[3] === undefined ? identityScript(m[1], m[2]) : inventoryScript(m[1], m[2], m[3]));
  };

  const shellBlocked = { stdout: '', stderr: 'Command not allowed', error: 'Forbidden', errorCode: 'forbidden', timedOut: false };
  const logBlocked = { success: false, supported: true, found: false, errorCode: 'log_path_not_allowed' };
  const logGuard = (opts) => {
    const p = opts && opts.logPath;
    return !p || isGameLog(String(p).trim()) ? null : logBlocked;
  };
  const guards = {
    'run-shell-command': (cmd) => (typeof cmd === 'string' && (SHELL_ALLOWLIST.test(cmd) || isLogScan(cmd)) ? null : shellBlocked),
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
      const arg = typeof args[0] === 'string' ? args[0].slice(0, 200) : args[0];
      console.log('[ETOR-CF]', new Date().toISOString(), blocked ? 'BLOCKED' : 'ALLOWED', channel, arg);
      return blocked || listener(event, ...args);
    });
  };
  if (ipcMain.handle === handle) throw new Error('[ETOR-CF] failed to install IPC guard');
})(require('electron').ipcMain);
