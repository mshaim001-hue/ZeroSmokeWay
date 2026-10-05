# Phaser gesture verification

Run the app with `npm run dev --prefix webapp`. From the repository root, install QA dependencies with `npm ci` (Node 20+ and Google Chrome required).

- `npm run qa:core`: exercise canvas drags, hold and swipes at 390×844.
- `PLAY_MODE=buttons npm run qa:core`: separately check accessible HTML controls.
- `PLAY_URL=http://127.0.0.1:5175/ npm run qa:core`: override the app address.

The script uses a disposable browser context. Reports and screenshots stay in ignored `docs/qa/playthrough-run/`. A missing door fails the test; another door cannot silently replace it.

## Verified on 2026-10-05

Browser checks used an isolated local port, preserving the main app save:

- Entry: two cards moved to the lower area and released outside their original hit zones; selection persisted and the scene became ready.
- Pleasure at 390 px: cigarette moved off the table; object state changed and continuation became available.
- Loop at 390 px: three objects inspected through canvas; the loop opened after a drag ending outside its original zone.
- World at 390 px: three consecutive swipes removed all three layers.
- All 18 client and 11 server tests passed; production build passed.

The standalone QA script received a syntax check, but was not executed end to end in this session. Physical phones and hardware touch cancellation remain unverified.
