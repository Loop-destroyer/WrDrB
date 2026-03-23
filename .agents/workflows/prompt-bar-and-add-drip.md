---
description: How to implement the Prompt Bar AI integration and Add Drip (apparel) button functionality
---

# Prompt Bar & Add Drip — Implementation Workflow

## Overview

Two core features on the Drip tab need functional wiring:

1. **Prompt Bar** — text input that currently triggers a random spin. Should be connected to an AI/recommendation engine that filters or weights outfit choices based on the user's prompt (e.g., "rainy coffee date" → prioritize waterproof overlayers + boots).

2. **Add Drip** — the `+` FAB and `AddApparelModal` that lets users add new wardrobe items. Currently mock, needs real state management and persistence.

---

## Phase 1: Prompt Bar Integration

### 1.1 Define the prompt processing pipeline

Create a new utility module:

```
src/utils/promptEngine.js
```

This module should export a function:

```js
/**
 * Processes a user prompt and returns weighted/filtered item pools.
 * @param {string} prompt — natural language outfit request
 * @param {Object} wardrobe — { tops, bottoms, shoes, overlayers, onePieces }
 * @param {Object} context — { weather, gender, occasion }
 * @returns {{ tops: Item[], bottoms: Item[], shoes: Item[], overlayers?: Item[] }}
 */
export function processPrompt(prompt, wardrobe, context) { ... }
```

### 1.2 Add keyword matching (MVP)

Start with simple keyword-based matching before wiring an LLM:

- **Weather keywords**: "rainy", "cold", "sunny", "hot" → filter by item tags
- **Occasion keywords**: "formal", "casual", "date", "gym" → filter by category
- **Color keywords**: "black", "white", "colorful" → filter by color property

### 1.3 Wire into DripRoulette

In `DripRoulette.jsx`, the `FloatingPromptBar` component's `onSpin` callback should:

1. Read the `prompt` state
2. If prompt is non-empty, call `processPrompt(prompt, wardrobe, context)`
3. Pass filtered item pools to the `ReelTile` components instead of the full arrays
4. If prompt is empty, use the default full arrays (current behavior)

### 1.4 Update the spin handler

```js
// In handleSpin():
const pools = prompt.trim()
    ? processPrompt(prompt, { tops: TOPS, bottoms: BOTTOMS, ... }, { weather, gender })
    : { tops: TOPS, bottoms: BOTTOMS, shoes: SHOES, overlayers: OVERLAYERS }
```

### 1.5 Add prompt result feedback

After a prompted spin, show a modified toast:

```
🎯 "rainy coffee date" → Spin #3
```

This reinforces that the prompt influenced the outfit.

---

## Phase 2: Add Drip Button Integration

### 2.1 Create a wardrobe state manager

Create a context/store for wardrobe data:

```
src/context/WardrobeContext.jsx
```

This should:
- Hold the full wardrobe arrays (tops, bottoms, shoes, overlayers, onePieces)
- Expose `addItem(category, item)` and `removeItem(category, itemId)` actions
- Persist to localStorage (MVP) or a backend API (future)

### 2.2 Update AddApparelModal

File: `src/components/AddApparelModal.jsx`

The modal needs:
- [ ] Image upload/capture (use FileReader API for MVP)
- [ ] Auto-categorization (use the `type` chip selection for MVP)
- [ ] Generate a unique ID for each new item
- [ ] Call `addItem(category, newItem)` from the wardrobe context
- [ ] Show success feedback with the item's emoji/image

### 2.3 Wire OOTD camera button

The purple camera FAB at the bottom-right currently does nothing. Wire it to:
- Open the device camera (or file picker on desktop)
- Auto-detect the garment type (future: use AI classification)
- Pre-fill the AddApparelModal with detected info

### 2.4 Update DripRoulette to use wardrobe context

Replace the static imports:
```diff
-import { TOPS, BOTTOMS, SHOES, OVERLAYERS, ONE_PIECES } from '../data/mockData'
+const { tops, bottoms, shoes, overlayers, onePieces } = useWardrobe()
```

---

## Phase 3: Polish & Testing

### 3.1 Prompt bar UX refinements
- [ ] Add typing indicator animation while processing
- [ ] Show suggestion chips below the prompt bar (e.g., "☀️ Sunny", "🌧️ Rainy")
- [ ] Haptic feedback on mobile when prompt-based spin completes
- [ ] Prompt history (last 5 prompts, shown as chips)

### 3.2 Add drip UX refinements
- [ ] Image cropping before upload
- [ ] Color extraction from uploaded image
- [ ] Item deduplication detection
- [ ] Undo/recently-added section in the Vault tab

### 3.3 Testing checklist
- [ ] Verify prompt with no matching items falls back to random spin
- [ ] Verify newly added items appear in the roulette
- [ ] Test on multiple screen ratios (16:9, 19.5:9, 20:9)
- [ ] Test adding items to all categories
- [ ] Test localStorage persistence across page reloads

---

## File Summary

| File | Purpose |
|:-----|:--------|
| `src/utils/promptEngine.js` | [NEW] Prompt → filtered wardrobe pools |
| `src/context/WardrobeContext.jsx` | [NEW] Wardrobe state management + persistence |
| `src/components/AddApparelModal.jsx` | [MODIFY] Wire to wardrobe context, add image upload |
| `src/pages/DripRoulette.jsx` | [MODIFY] Use prompt engine + wardrobe context |
| `src/data/mockData.js` | [KEEP] Used as initial seed data |
