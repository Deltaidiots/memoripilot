import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class MemoryTreeDataProvider implements vscode.TreeDataProvider<MemoryItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<MemoryItem | undefined | null | void> = new vscode.EventEmitter<MemoryItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MemoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string | undefined) {
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MemoryItem): Thenable<MemoryItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No memory bank in empty workspace');
      return Promise.resolve([]);
    }

    if (element) {
      return Promise.resolve([]);
    } else {
      const memoryBankPath = path.join(this.workspaceRoot, 'memory-bank');
      if (this.pathExists(memoryBankPath)) {
        return Promise.resolve(this.getMemoryFiles(memoryBankPath));
      } else {
        vscode.window.showInformationMessage('Workspace has no memory-bank');
        return Promise.resolve([]);
      }
    }
  }

  private getMemoryFiles(memoryBankPath: string): MemoryItem[] {
    if (this.pathExists(memoryBankPath)) {
      const files = fs.readdirSync(memoryBankPath);
      return files.map(file => {
        const filePath = path.join(memoryBankPath, file);
        return new MemoryItem(file, vscode.TreeItemCollapsibleState.None, {
          command: 'vscode.open',
          title: '',
          arguments: [vscode.Uri.file(filePath)]
        });
      });
    } else {
      return [];
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }
}

class MemoryItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
  }

  iconPath = {
    light: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'light', 'memory.svg')),
    dark: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'dark', 'memory.svg'))
  };
}
