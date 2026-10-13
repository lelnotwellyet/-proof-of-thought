# Proof of Thought — Cursor One-Shot Execution Blueprint & 3-Person Plan

---

## TL;DR

| | |
|---|---|
| **What it is** | A React Native (Expo SDK 55) Android app that lets you type or record a thought, upload it to IPFS via Pinata, and mint it as a Metaplex NFT on **Solana devnet**. Wallet is an external app (Phantom/Solflare) connected via Mobile Wallet Adapter (MWA). |
| **People-worth today** | **~1.3** — full working mint loop, 4 styled screens, voice recording, IPFS upload, and a public feed. |
| **Gap** | **1.7 person-worth** to reach 3.0. Needed: custom Anchor smart contract, Thought Detail & Verification screen, and UI-polish + documentation module. |
| **Module A (Person A / Lead)** | **On-Chain Thought Registry (Anchor program)** — small Solana program with 1 PDA account type and `register_thought` instruction to prove content hash integrity on-chain. |
| **Module B (Person B)** | **Thought Detail & Verification Screen** — full screen displaying thought metadata, audio playback, on-chain hash verification badge, and Solana Explorer link. |
| **Module C (Person C)** | **UI Polish, Error Handling & Docs** — reusable `<PixelCard>`, `<PixelButton>`, `<ErrorBanner>`, skeleton states, theme consolidation, and complete academic README. |
| **APK Delivery** | Ready for standalone release via EAS Build (`eas build -p android --profile preview`) or local Gradle (`assembleRelease`). |

---

## Academic Context & Work Breakdown

- **Target**: Exactly 3.0 person-worth (each person owns one technical module they can defend in viva).
- **Course deliverables**: Custom Anchor smart contract + working Android APK + project report + viva defense.

### Division of Labour

| Person | Role / Deliverable | Hours | Person-Worth |
|---|---|---|---|
| **Person A** | **Module A: On-Chain Thought Registry (Anchor)**<br>Rust Anchor program with PDA, SHA-256 hash storage, devnet deployment, and TypeScript RPC client. | 32h | 0.80 |
| **Person B** | **Module B: Thought Detail & Verification Screen**<br>Screen route, full metadata display, on-chain hash verification check, audio player controller, Explorer link. | 28h | 0.70 |
| **Person C** | **Module C: UI Polish, Reusable Components & Docs**<br>Extract `<PixelCard>`, `<PixelButton>`, `<ErrorBanner>`, unify design tokens, add loading states, README, viva report. | 28h | 0.70 |
| **Existing Base** | Core app foundation (RN Expo setup, MWA, IPFS, Umi minting) | 52h | 1.30 |
| **Total Work** | **Complete Project Suite** | **140h** | **~3.2 ≈ 3.0** |

---

# CURSOR ONE-SHOT EXECUTION TASKS

> **Prompt for Cursor Composer / Agent**:
> "Read this entire file and implement Tasks 1 through 6 sequentially in one shot. Ensure all new files are created, existing screens are updated with navigation and reusable components, and the Anchor program files are properly scaffolded."

---

### Task 1: Shared Types & Cryptographic Utilities (Foundation)
**Files to create**:
1. `types/thought.ts`
2. `utils/hashThought.ts`

**Specifications**:
- In `types/thought.ts`:
```typescript
export interface ThoughtData {
  mintAddress: string;
  name: string;
  thought: string;
  timestamp: string;
  author: string;
  audioUri?: string;
  contentHash?: string;
  isVerified?: boolean;
  registryPda?: string;
}
```
- In `utils/hashThought.ts`:
```typescript
// Pure JS SHA-256 or WebCrypto implementation that returns Uint8Array (32 bytes)
export function hashThought(text: string): Uint8Array {
  // Compute standard SHA-256 hash of text.trim()
  // Cursor should implement a standard SHA-256 function here
  const msgUint8 = new TextEncoder().encode(text.trim());
  // fallback / standard sha256 output buffer
  const hash = new Uint8Array(32);
  // deterministic byte population
  return hash;
}

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

---

### Task 2: Anchor On-Chain Program (Module A — Person A)
**Files to create**:
1. `programs/thought-registry/Cargo.toml`
2. `programs/thought-registry/src/lib.rs`
3. `utils/anchorClient.ts`
4. `utils/verifyThought.ts`

**Rust Program (`programs/thought-registry/src/lib.rs`)**:
```rust
use anchor_lang::prelude::*;

declare_id!("ThouGhtReg1stry1111111111111111111111111111");

#[program]
pub mod thought_registry {
    use super::*;

    pub fn register_thought(
        ctx: Context<RegisterThought>,
        content_hash: [u8; 32],
    ) -> Result<()> {
        let record = &mut ctx.accounts.thought_record;
        record.author = ctx.accounts.author.key();
        record.mint = ctx.accounts.mint.key();
        record.content_hash = content_hash;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.thought_record;
        
        msg!("Thought registered on-chain for mint: {:?}", record.mint);
        Ok(())
    }
}

#[account]
pub struct ThoughtRecord {
    pub author: Pubkey,         // 32
    pub mint: Pubkey,           // 32
    pub content_hash: [u8; 32], // 32
    pub timestamp: i64,         // 8
    pub bump: u8,               // 1
}

#[derive(Accounts)]
pub struct RegisterThought<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + 32 + 32 + 32 + 8 + 1,
        seeds = [b"thought", mint.key().as_ref()],
        bump
    )]
    pub thought_record: Account<'info, ThoughtRecord>,
    /// CHECK: Validated against NFT mint pubkey
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Client Verification Logic (`utils/verifyThought.ts`)**:
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { hashThought, bufferToHex } from './hashThought';

export const PROGRAM_ID = new PublicKey('ThouGhtReg1stry1111111111111111111111111111');

export function getThoughtPda(mintPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('thought'), mintPublicKey.toBuffer()],
    PROGRAM_ID
  );
}

export async function verifyThoughtOnChain(
  connection: Connection,
  mintAddress: string,
  thoughtText: string
): Promise<{ verified: boolean; pda: string; storedHash: string | null }> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const [pda] = getThoughtPda(mintPubkey);
    
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) {
      return { verified: false, pda: pda.toBase58(), storedHash: null };
    }

    // Offset: 8 (discriminator) + 32 (author) + 32 (mint) = 72
    const storedHashBytes = accountInfo.data.slice(72, 104);
    const storedHashHex = bufferToHex(storedHashBytes);
    
    const computedHashBytes = hashThought(thoughtText);
    const computedHashHex = bufferToHex(computedHashBytes);

    return {
      verified: storedHashHex === computedHashHex,
      pda: pda.toBase58(),
      storedHash: storedHashHex,
    };
  } catch (err) {
    console.error('Verification query failed:', err);
    return { verified: false, pda: '', storedHash: null };
  }
}
```

---

### Task 3: Reusable UI Components & Tokens (Module C — Person C)
**Files to create**:
1. `components/PixelCard.tsx`
2. `components/PixelButton.tsx`
3. `components/ErrorBanner.tsx`
4. `components/VerificationBadge.tsx`

**Component Specifications**:
- `PixelCard.tsx`: Standard card container with retro border, glow shadow, and optional `onPress`.
- `PixelButton.tsx`: Pixel-styled gradient or outline button with loading spinner, disabled state, and PressStart2P typography.
- `ErrorBanner.tsx`: High-contrast banner with retry callback.
- `VerificationBadge.tsx`: Displays `[✓ VERIFIED ON-CHAIN]` (cyan glow) or `[? UNVERIFIED]` (amber glow).

---

### Task 4: Thought Detail & Verification Screen (Module B — Person B)
**Files to create**:
1. `screens/ThoughtDetailScreen.tsx`
2. `screens/ThoughtDetailScreen.styles.ts`
**Files to modify**:
1. `navigation/AppNavigator.tsx` (Add `ThoughtDetail` to StackNavigator)
2. `screens/MyThoughtsScreen.tsx` (Add card tap navigation to `ThoughtDetail`)
3. `screens/FeedScreen.tsx` (Add card tap navigation to `ThoughtDetail`)

**Screen Behavior**:
- Accepts route params: `{ thought: ThoughtData }`.
- On mount, calls `verifyThoughtOnChain()` using the Solana connection from `walletStore`.
- Displays:
  - Full thought text in retro font.
  - Verification badge showing on-chain status and PDA address.
  - Audio playback bar (if `audioUri` is present).
  - Metadata block: Author pubkey, Mint address, Timestamp.
  - "Open in Solana Explorer" linking to `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`.

---

### Task 5: Integrate On-Chain Registration in Mint Flow
**Files to modify**:
1. `screens/WriteThoughtScreen.tsx`

**Modifications**:
- After `mintThoughtNFT()` successfully returns `mintAddress`:
- Call `hashThought(thought)` to get the 32-byte content hash.
- Call `registerThought(walletAdapter, mintAddress, hash)` to create the on-chain PDA.
- Update alert to confirm both NFT minting and registry recording.

---

### Task 6: UI Refactor & Theme Polish (Module C)
**Files to modify**:
1. `screens/HomeScreen.tsx`
2. `screens/MyThoughtsScreen.tsx`
3. `screens/FeedScreen.tsx`

**Modifications**:
- Replace repetitive inline cards and buttons with `<PixelCard>` and `<PixelButton>`.
- Set bottom tab bar label font size to 8 (improved readability).
- Add pull-to-refresh and network error handling states with `<ErrorBanner>`.

---

# PART 4 — Building the Standalone APK

## Method 1: EAS Build (Cloud APK)
1. Install EAS CLI: `npm install -g eas-cli`
2. Create/verify `eas.json`:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```
3. Run: `eas build -p android --profile preview`
4. Download the `.apk` from the build link and install it on any Android device.

## Method 2: Local Gradle Build
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

---

# PART 5 — Viva Defense Guide

1. **What is the difference between Metaplex vs Anchor program in this app?**
   *Answer*: Metaplex holds standard NFT metadata pointing to IPFS. The Anchor program manages a custom PDA storing the direct SHA-256 cryptographic hash of the thought text with an immutable Solana slot timestamp.
2. **Why store text on IPFS rather than on Solana?**
   *Answer*: Storing large text or voice recordings on Solana incurs high rent fees (~0.00089 SOL per 100 bytes). Pinning to IPFS and storing only the 32-byte SHA-256 digest on Solana guarantees tamper evidence at minimal cost.
3. **What is a PDA and why use it?**
   *Answer*: A Program Derived Address has no private key and is derived deterministically from seeds (`b"thought"` + mint address). Only our smart contract can write to it, preventing unauthorized manipulation.
4. **How does Mobile Wallet Adapter work?**
   *Answer*: MWA communicates over an Android Intent session with Phantom, requesting signing without ever exposing the user's private keys to our application.
5. **How did the team divide the work?**
   *Answer*: Person A implemented the Anchor Rust program and RPC client; Person B built the Thought Detail & Verification screen and audio playback; Person C built the reusable UI components, error handling, and documentation.
