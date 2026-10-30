import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { WorldEvent } from './events';
import { SessionWatcher, WatcherOptions } from './watcher';

let watcher: SessionWatcher;
let statusItem: vscode.StatusBarItem;

function readOptions(): WatcherOptions {
  const cfg = vscode.workspace.getConfiguration('iaworld');
  const claudeDir = cfg.get<string>('claudeDir') || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return {
    projectsDir: path.join(claudeDir, 'projects'),
    workspaceDirs: (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath),
    followAll: cfg.get<boolean>('followAllProjects', false),
  };
}

class WorldPanel {
  static current: WorldPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  // Messages envoyés avant que la webview ait signalé 'ready'.
  private pending: unknown[] | undefined = [];

  static show(context: vscode.ExtensionContext, preserveFocus = false): WorldPanel {
    if (WorldPanel.current) {
      WorldPanel.current.panel.reveal(undefined, preserveFocus);
      return WorldPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'iaworld',
      'IA World',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      },
    );
    WorldPanel.current = new WorldPanel(panel, context);
    return WorldPanel.current;
  }

  private constructor(private readonly panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
    panel.webview.html = this.html(panel.webview, context.extensionUri);
    panel.onDidDispose(() => this.dispose(), null, this.disposables);
    panel.webview.onDidReceiveMessage(
      (msg) => {
        if (msg?.type === 'ready') {
          const queued = this.pending ?? [];
          this.pending = undefined;
          this.post({ type: 'snapshot', snapshot: watcher.snapshot() });
          queued.forEach((m) => this.post(m));
        }
        if (msg?.type === 'pickSession') vscode.commands.executeCommand('iaworld.pickSession');
      },
      null,
      this.disposables,
    );
  }

  post(msg: unknown): void {
    if (this.pending) {
      // L'instantané envoyé au 'ready' couvre déjà l'état : seules les commandes sont gardées.
      if ((msg as { type?: string }).type === 'demo') this.pending.push(msg);
      return;
    }
    this.panel.webview.postMessage(msg);
  }

  private html(webview: vscode.Webview, root: vscode.Uri): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    const media = (p: string) => webview.asWebviewUri(vscode.Uri.joinPath(root, 'media', p));
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media('world.css')}">
<title>IA World</title>
</head>
<body>
<div id="app"></div>
<script type="module" nonce="${nonce}" src="${media('js/main.js')}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    WorldPanel.current = undefined;
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}

function updateStatus(): void {
  const robots = watcher.sessionCount + watcher.activeAgentCount;
  statusItem.text = watcher.isLive ? `$(globe) IA World · ${robots > 1 ? `${robots} robots` : 'en direct'}` : '$(globe) IA World';
  statusItem.tooltip = watcher.isLive ? 'Claude travaille — ouvrir le monde' : 'Ouvrir le monde de Claude';
}

export function activate(context: vscode.ExtensionContext): void {
  watcher = new SessionWatcher(readOptions());

  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.command = 'iaworld.open';
  updateStatus();
  statusItem.show();

  watcher.on('event', (ev: WorldEvent) => {
    WorldPanel.current?.post({ type: 'event', event: ev });
    if (['status', 'spawn', 'despawn', 'sessionStart', 'sessionEnd'].includes(ev.type)) updateStatus();
    if (ev.type === 'status' && ev.live && !WorldPanel.current && vscode.workspace.getConfiguration('iaworld').get('autoOpen')) {
      WorldPanel.show(context, true);
    }
  });
  watcher.on('session', (snapshot) => {
    WorldPanel.current?.post({ type: 'session', snapshot });
    updateStatus();
  });
  watcher.start();

  context.subscriptions.push(
    statusItem,
    { dispose: () => watcher.stop() },
    vscode.commands.registerCommand('iaworld.open', () => WorldPanel.show(context)),
    vscode.commands.registerCommand('iaworld.demo', () => WorldPanel.show(context).post({ type: 'demo' })),
    vscode.commands.registerCommand('iaworld.pickSession', async () => {
      const sessions = watcher.listSessions();
      const items: (vscode.QuickPickItem & { file?: string })[] = [
        { label: '$(sync) Automatique', description: 'Suivre toutes les sessions actives' },
        ...sessions.map((s) => ({
          label: s.title || path.basename(s.file, '.jsonl'),
          description: s.project,
          detail: new Date(s.mtime).toLocaleString(),
          file: s.file,
        })),
      ];
      const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Quelle session Claude afficher ?', matchOnDescription: true });
      if (pick) watcher.pin(pick.file);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('iaworld')) watcher.configure(readOptions());
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => watcher.configure(readOptions())),
  );
}

export function deactivate(): void {
  watcher?.stop();
}
