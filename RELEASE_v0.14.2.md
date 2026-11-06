# Nibor Motion v0.14.2 — Stability & Math Fixes

Built from v0.14.1 PREVIEW_FIX.

## Changes
- Fixed malformed quadratic LaTeX fraction in generated scene.
- Quadratic parser now accepts missing linear or constant terms, coefficient ±1, and signed integer terms in any order.
- Computes real roots for nonnegative discriminants; simplifies rational roots exactly when the discriminant is a perfect square.
- Displays exact radical form for irrational roots, and an explicit no-real-roots message when the discriminant is negative.
- Reuses existing speechFromMath conversion for generated scene narration; handles i^n.
- Retains a single replacement confirmation using the existing internal event bridge (no DataTransfer).
- Updated app version to 0.14.2.

## Verification
- node --check on all JavaScript files: passed.
- node test-auto-reels.cjs: passed (7 quadratic cases and 1 imaginary-power case, plus one-confirmation assertions).
- ZIP CRC integrity check: passed.

## Limitations
- No browser-device integration or video export test completed.
- Offline CDN dependencies and deterministic export are not yet addressed.
- The quadratic parser supports integer coefficients, not arbitrary symbolic expressions.
