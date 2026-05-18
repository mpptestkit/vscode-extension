# MPP Payment Flow Hints

Inline hints for the HTTP 402 payment flow in [MPP TestKit](https://mpptestkit.com) code.

## What it does

Shows small inline labels next to every MPP SDK call so you can see the payment flow at a glance — without leaving the editor.

```ts
const res = await mppFetch( ⬡ 402 flow: wallet → pay → retry  "http://localhost:3001/api/data");

const client = await createTestClient( ⬡ auto-wallet · airdrop  { network: "devnet" });

app.get("/api/data", mpp.charge( ⬡ 0.001 SOL per request  { amount: "0.001" }), handler);

const mpp = createTestServer( ⬡ auto-recipient wallet  );
```

## Supported call sites

| Call | Hint |
|---|---|
| `mppFetch(` | `⬡ 402 flow: wallet → pay → retry` |
| `createTestClient(` | `⬡ auto-wallet · airdrop` |
| `client.fetch(` | `⬡ handles 402 automatically` |
| `.charge(` | `⬡ 0.001 SOL per request` (amount extracted from args) |
| `createTestServer(` | `⬡ auto-recipient wallet` |

Hints only appear in files that import `mpp-test-sdk`. Toggle off per-file with `mpp.hints.showOnAllFiles`.

## Settings

| Setting | Default | Description |
|---|---|---|
| `mpp.hints.enabled` | `true` | Show / hide all hints |
| `mpp.hints.showOnAllFiles` | `false` | Show hints in every JS/TS file, not just those that import `mpp-test-sdk` |

## Requirements

- VS Code 1.75+
- Editor inlay hints must be enabled (`editor.inlayHints.enabled`)

## Install

### From VS Marketplace
Search **"MPP Payment Flow Hints"** in the Extensions panel.

### From source
```sh
cd packages/vscode-extension
npm install
npm run compile

# Package as .vsix
npm install -g @vscode/vsce
vsce package

# Install locally
code --install-extension mpp-payment-hints-0.1.0.vsix
```

## Links

- [mpptestkit.com](https://mpptestkit.com)
- [npm: mpp-test-sdk](https://www.npmjs.com/package/mpp-test-sdk)
- [GitHub](https://github.com/mpptestkit)
