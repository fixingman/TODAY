# Motion & Animation

> Animation timing, easing, and philosophy.

---

## Philosophy

Motion in TODAY communicates state, not decoration. It's calm, functional, and deliberate.

**The Breath Pattern** — signature motion: slow, gentle pulse that says "I'm alive, I'm waiting."

```css
@keyframes timerCompletePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.65; }
}
animation: timerCompletePulse 1.8s ease-in-out infinite;
```

Why 1.8s: slower than heartbeat, calmer than urgency, matches breathing rhythm.

---

## Timing Tokens

| Token | Value | Usage |
|---|---|---|
| `--dur-fast` | 0.15s | Enter snaps, hover, timer open |
| `--dur-base` | 0.18s | General UI transitions |
| `--dur-mid` | 0.20s | Focus mode exit, fades |
| `--dur-slow` | 0.30s | Recede/reveal, slide-up panels |

---

## Easing

| Token | Value | Usage |
|---|---|---|
| `--ease-out` | cubic-bezier(0.16, 1, 0.3, 1) | Overshoot-free deceleration |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Subtle overshoot for panels |
| `--ease-std` | ease | Generic |

---

## Animation Types

### Task Completion
- Checkbox fills with accent color
- Particles drift upward (ember drift)
- Haptic feedback (success pattern)
- Sound: soft completion tone

### All-Done Celebration
- Accent glow pulse (radial, 1.2s fade)
- Extra particle burst
- Double haptic (150ms apart)

### Focus Mode
- Recede: non-focused tasks fade to 7% opacity
- Timer bar pulses gently when complete
- Controls slide up with spring easing

### Idle Companion
- Fade in over 0.6s
- ASCII animation (creature-specific timing)
- Fade out on activity (0.6s)

---

## Rules

1. **Never block interaction** — animations complete async
2. **Meaningful, not decorative** — every motion communicates state
3. **Calm, not urgent** — prefer slow fades over snappy transitions
4. **Respect reduced-motion** — check `prefers-reduced-motion`
