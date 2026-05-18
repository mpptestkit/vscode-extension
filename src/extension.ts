import * as vscode from "vscode";

// ─── Pattern definitions ──────────────────────────────────────

interface Pattern {
  regex: RegExp;
  getLabel: (match: RegExpExecArray, docText: string) => string;
}

/**
 * Scan forward in the document text from `offset` looking for
 * `amount: "X.X"` or `amount: 'X.X'` within the next 200 chars.
 */
function extractChargeAmount(text: string, offset: number): string {
  const snippet = text.slice(offset, offset + 200);
  const m = /amount\s*:\s*["']([0-9.]+)["']/.exec(snippet);
  return m ? m[1] : "";
}

/**
 * Each entry matches a specific MPP SDK call site and returns the
 * hint label to display right after the opening parenthesis.
 */
const PATTERNS: Pattern[] = [
  {
    // mppFetch("url") or mppFetch("url", init)
    regex: /\bmppFetch\s*\(/g,
    getLabel: () => "⬡ 402 flow: wallet → pay → retry",
  },
  {
    // createTestClient() or createTestClient({ ... })
    regex: /\bcreateTestClient\s*\(/g,
    getLabel: () => "⬡ auto-wallet · airdrop",
  },
  {
    // client.fetch("url") — the TestClient method
    regex: /\bclient\.fetch\s*\(/g,
    getLabel: () => "⬡ handles 402 automatically",
  },
  {
    // mpp.charge({ amount: "0.001" }) — extract amount when available
    regex: /\.charge\s*\(/g,
    getLabel: (match, text) => {
      const amount = extractChargeAmount(text, match.index + match[0].length);
      return amount ? `⬡ ${amount} SOL per request` : "⬡ SOL payment required";
    },
  },
  {
    // createTestServer() — server setup
    regex: /\bcreateTestServer\s*\(/g,
    getLabel: () => "⬡ auto-recipient wallet",
  },
];

// ─── Inlay hints provider ─────────────────────────────────────

class MppInlayHintsProvider implements vscode.InlayHintsProvider {
  provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): vscode.InlayHint[] {
    const config = vscode.workspace.getConfiguration("mpp");

    if (!config.get<boolean>("hints.enabled", true)) {
      return [];
    }

    const text = document.getText();

    // Skip files that don't import mpp-test-sdk unless the user opted in
    const showOnAll = config.get<boolean>("hints.showOnAllFiles", false);
    if (!showOnAll && !text.includes("mpp-test-sdk")) {
      return [];
    }

    const hints: vscode.InlayHint[] = [];

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(text)) !== null) {
        // Place hint right after the opening "(" of the call
        const hintPos = document.positionAt(match.index + match[0].length);

        // Only emit hints inside the requested viewport range
        if (hintPos.isBefore(range.start) || hintPos.isAfter(range.end)) {
          continue;
        }

        const label = pattern.getLabel(match, text);
        const hint = new vscode.InlayHint(
          hintPos,
          " " + label + " ",
          vscode.InlayHintKind.Type,
        );
        hint.paddingLeft = true;
        hints.push(hint);
      }
    }

    return hints;
  }
}

// ─── Activate / deactivate ────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = [
    { language: "typescript" },
    { language: "javascript" },
    { language: "typescriptreact" },
    { language: "javascriptreact" },
  ];

  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(
      selector,
      new MppInlayHintsProvider(),
    ),
  );
}

export function deactivate(): void {}
