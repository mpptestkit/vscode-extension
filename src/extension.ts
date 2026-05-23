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
 * Detect `chain: "base"` or `chain: 'base'` near a call (within 400 chars before `(`).
 */
function isBaseChainContext(text: string, callIndex: number): boolean {
  const before = text.slice(Math.max(0, callIndex - 400), callIndex);
  return /chain\s*:\s*["']base["']/.test(before);
}

function currencyForContext(text: string, callIndex: number): "SOL" | "ETH" {
  return isBaseChainContext(text, callIndex) ? "ETH" : "SOL";
}

/** True when the file imports an MPP SDK (TS, Python, Go, or Rust). */
function importsMppSdk(text: string): boolean {
  return (
    text.includes("mpp-test-sdk") ||
    text.includes("mpp_test_sdk") ||
    text.includes("mpp-test-sdk-go") ||
    text.includes("mpp_test_sdk::") ||
    /\bimport\s+mpp\b/.test(text) ||
    /\bfrom\s+mpp\b/.test(text)
  );
}

/**
 * Each entry matches a specific MPP SDK call site and returns the
 * hint label to display right after the opening parenthesis.
 */
const PATTERNS: Pattern[] = [
  {
    regex: /\bmppFetch\s*\(|\bmpp_fetch\s*\(/g,
    getLabel: (match, text) => {
      const cur = currencyForContext(text, match.index);
      if (cur === "ETH") return "⬡ 402 flow: wallet → ETH pay → retry";
      return "⬡ 402 flow: wallet → pay → retry";
    },
  },
  {
    regex: /\bcreateTestClient\s*\(|\bcreate_test_client\s*\(|\bCreateTestClient\s*\(/g,
    getLabel: (match, text) => {
      if (isBaseChainContext(text, match.index)) {
        return "⬡ Base wallet · fund via faucet";
      }
      return "⬡ auto-wallet · airdrop";
    },
  },
  {
    regex: /\bclient\.fetch\s*\(/g,
    getLabel: () => "⬡ handles 402 automatically",
  },
  {
    regex: /\.charge\s*\(|\bflask_charge\s*\(|\bfastapi_charge\s*\(/g,
    getLabel: (match, text) => {
      const amount = extractChargeAmount(text, match.index + match[0].length);
      const cur = currencyForContext(text, match.index);
      if (amount) return `⬡ ${amount} ${cur} per request`;
      return cur === "ETH" ? "⬡ ETH payment required" : "⬡ SOL payment required";
    },
  },
  {
    regex: /\bcreateTestServer\s*\(|\bcreate_test_server\s*\(|\bCreateTestServer\s*\(/g,
    getLabel: (match, text) => {
      if (isBaseChainContext(text, match.index)) {
        return "⬡ Base recipient (0x)";
      }
      return "⬡ auto-recipient wallet";
    },
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

    const showOnAll = config.get<boolean>("hints.showOnAllFiles", false);
    if (!showOnAll && !importsMppSdk(text)) {
      return [];
    }

    const hints: vscode.InlayHint[] = [];

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(text)) !== null) {
        const hintPos = document.positionAt(match.index + match[0].length);

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
    { language: "python" },
    { language: "go" },
    { language: "rust" },
  ];

  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(
      selector,
      new MppInlayHintsProvider(),
    ),
  );
}

export function deactivate(): void {}
