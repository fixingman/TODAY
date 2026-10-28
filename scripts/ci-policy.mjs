// Canonical full inventory and reviewed CI dependency policy. Unknown paths fail broad.
export const SUITE = [
  "ci-invariants",
  "design-lint",
  "token-parity-test",
  "timezone-test",
  "component-contract-test",
  "smoke-test",
  "accessibility-test",
  "visual-test",
  "splash-test",
  "platform-test",
  "service-worker-test",
  "connections-test",
  "trello-test",
  "gmail-test",
  "gmail-feedback-test",
  "pool-wording-test",
  "calendar-test",
  "calendar-nudge-policy-unit-test",
  "task-enrich-test",
  "dropbox-test",
  "sync-merge-unit-test",
  "dreambank-unit-test",
  "meeting-extract-unit-test",
  "error-monitor-unit-test",
  "console-probe-test",
  "ci-plan-test",
  "browser-fixture-test",
  "ci-tooling-test",
  "performance-harness-test",
  "sound-test",
  "zones-test",
  "task-actions-test",
  "task-bounce-test",
  "assistant-test",
  "ai-assist-unit-test",
  "writing-evaluator-test",
  "feedback-policy-unit-test",
  "suggestion-policy-unit-test",
  "suggestion-outcomes-test",
  "nudge-test",
  "nudge-feedback-test",
  "nudge-delivery-test",
  "habits-test",
  "triage-test",
  "meeting-test",
  "voice-capture-test",
  "memory-panel-test",
  "observation-pool-test",
  "mailto-test",
  "about-test",
  "reflections-test",
  "reflection-feedback-test",
  "day-lifecycle-test",
  "drag-test",
  "focus-test",
  "focus-session-unit-test",
  "insights-test",
  "noticed-model-unit-test"
];
export const EXCLUDED = {
  "ai-test": "Requires an approved provider key and live calls.",
  "dream-live-test": "Requires approved keys, live calls and macOS speech.",
  "performance-test": "Separate unchanged five-run release/nightly gate."
};
export const NON_TEST_SUITE = new Set(['design-lint','ci-invariants']);
export const GROUPS = {
  "contracts": {
    "files": [],
    "suites": [
      "ci-invariants",
      "design-lint",
      "token-parity-test",
      "component-contract-test",
      "smoke-test"
    ]
  },
  "accessibility": {
    "files": [
      "assets/accessibility.js"
    ],
    "suites": [
      "accessibility-test",
      "visual-test"
    ],
    "full": true
  },
  "startup": {
    "files": [
      "assets/sound.js",
      "assets/splash.js",
      "assets/idle.js",
      "assets/celebration.js"
    ],
    "suites": [
      "sound-test",
      "splash-test"
    ],
    "full": true,
    "performance": true
  },
  "platform": {
    "files": [
      "assets/platform.js",
      "manifest.json"
    ],
    "suites": [
      "platform-test",
      "service-worker-test"
    ],
    "full": true,
    "performance": true
  },
  "foundation": {
    "files": [
      "index.html",
      "sw.js",
      "assets/feedback-policy.js",
      "assets/runtime.js",
      "assets/util.js"
    ],
    "suites": [],
    "full": true,
    "performance": true
  },
  "clock": {
    "files": [
      "assets/day-lifecycle.js"
    ],
    "suites": [
      "timezone-test",
      "day-lifecycle-test"
    ],
    "full": true
  },
  "connections": {
    "files": [
      "assets/connections.js",
      "netlify/functions/dropbox-token.js",
      "netlify/functions/dropbox-refresh.js",
      "netlify/functions/gmail-token.js",
      "netlify/functions/calendar-token.js"
    ],
    "suites": [
      "connections-test"
    ],
    "full": true
  },
  "sync": {
    "files": [
      "assets/dropbox.js",
      "assets/sync-merge.js"
    ],
    "suites": [
      "dropbox-test",
      "sync-merge-unit-test"
    ],
    "full": true
  },
  "tasks": {
    "files": [
      "assets/task-actions.js",
      "assets/zones.js",
      "assets/drag.js",
      "assets/triage.js"
    ],
    "suites": [
      "task-actions-test",
      "zones-test",
      "drag-test",
      "triage-test"
    ],
    "full": true
  },
  "assistant": {
    "files": [
      "assets/assistant.js",
      "assets/suggestion-policy.js"
    ],
    "suites": [
      "assistant-test",
      "suggestion-policy-unit-test",
      "suggestion-outcomes-test"
    ],
    "dependents": [
      "tasks",
      "sync",
      "focus",
      "memory",
      "connections"
    ]
  },
  "focus": {
    "files": [
      "assets/focus.js",
      "assets/focus-ask.js",
      "assets/focus-session.js"
    ],
    "suites": [
      "focus-test",
      "focus-session-unit-test"
    ],
    "dependents": [
      "gmail",
      "enrichment",
      "trello",
      "habits",
      "memory",
      "tasks"
    ]
  },
  "nudge": {
    "files": [
      "assets/nudge.js"
    ],
    "suites": [
      "nudge-test",
      "nudge-feedback-test",
      "nudge-delivery-test"
    ],
    "dependents": [
      "about", "memory", "calendar"
    ]
  },
  "calendar": {
    "files": [
      "assets/calendar.js",
      "assets/calendar-nudge.js",
      "assets/calendar-nudge-policy.js"
    ],
    "suites": [
      "calendar-test",
      "calendar-nudge-policy-unit-test"
    ],
    "dependents": [
      "nudge",
      "connections"
    ]
  },
  "trello": {
    "files": [
      "assets/trello.js"
    ],
    "suites": [
      "trello-test"
    ],
    "dependents": [
      "focus",
      "enrichment",
      "tasks",
      "memory",
      "sync"
    ]
  },
  "gmail": {
    "files": [
      "assets/gmail.js",
      "assets/gmail-feedback.js"
    ],
    "suites": [
      "gmail-test",
      "gmail-feedback-test",
      "mailto-test"
    ],
    "dependents": [
      "focus",
      "connections"
    ]
  },
  "enrichment": {
    "files": [
      "assets/task-enrich.js",
      "assets/enrichment-feedback.js",
      "netlify/functions/task-enrich.js"
    ],
    "suites": [
      "task-enrich-test"
    ],
    "dependents": [
      "focus",
      "connections"
    ]
  },
  "memory": {
    "files": [
      "assets/memory-panel.js"
    ],
    "suites": [
      "memory-panel-test"
    ],
    "dependents": [
      "about", "reflections", "gmail", "enrichment", "dreams", "insights", "sync"
    ]
  },
  "reflections": {
    "files": [
      "assets/reflections.js",
      "assets/reflection-wording.js",
            "assets/week-reflection-policy.js"
    ],
    "suites": [
      "reflections-test",
      "reflection-feedback-test",
      "observation-pool-test",
      "feedback-policy-unit-test"
    ],
    "dependents": [
      "nudge",
      "about",
      "memory",
      "sync"
    ]
  },
  "insights": {
    "files": [
      "assets/insights.js",
      "assets/noticed-model.js"
    ],
    "suites": [
      "insights-test",
      "noticed-model-unit-test"
    ],
    "dependents": [
      "nudge",
      "reflections",
      "memory",
      "about"
    ]
  },
  "dreams": {
    "files": [
      "assets/dreambank.js"
    ],
    "suites": [
      "dreambank-unit-test"
    ],
    "dependents": [
      "meeting",
      "sync",
      "memory"
    ]
  },
  "meeting": {
    "files": [
      "assets/meeting.js",
      "netlify/functions/meeting-extract.js"
    ],
    "suites": [
      "meeting-test",
      "meeting-extract-unit-test"
    ],
    "dependents": [
      "voice",
      "dreams",
      "tasks",
      "connections"
    ]
  },
  "voice": {
    "files": [
      "assets/voice-capture.js",
      "netlify/functions/transcribe.js"
    ],
    "suites": [
      "voice-capture-test"
    ],
    "dependents": [
      "meeting"
    ]
  },
  "about": {
    "files": [
      "assets/about.js",
      "assets/pool-wording.js"
    ],
    "suites": [
      "about-test",
      "pool-wording-test"
    ],
    "full": true
  },
  "habits": {
    "files": [
      "assets/habits.js"
    ],
    "suites": [
      "habits-test"
    ],
    "dependents": [
      "focus",
      "memory",
      "tasks", "clock"
    ]
  },
  "bounce": {
    "files": [
      "assets/task-bounce.js"
    ],
    "suites": [
      "task-bounce-test"
    ],
    "dependents": [
      "assistant",
      "tasks",
      "sync"
    ]
  },
  "poems": {
    "performance": true,
    "files": [
      "assets/poems.js",
      "assets/poem-utils.js",
      "poem.html",
      "netlify/edge-functions/poem.js"
    ],
    "suites": [],
    "dependents": [
      "startup"
    ]
  },
  "errors": {
    "files": [
      "assets/error-monitor.js"
    ],
    "suites": [
      "error-monitor-unit-test"
    ],
    "full": true
  },
  "ai-proxy": {
    "files": [
      "netlify/functions/ai-assist.js"
    ],
    "suites": [
      "ai-assist-unit-test"
    ],
    "dependents": [
      "assistant",
      "focus",
      "nudge",
      "reflections",
      "meeting",
      "dreams",
      "about"
    ]
  },
  "tooling": {
    "files": [],
    "suites": [
      "ci-plan-test",
      "browser-fixture-test",
      "ci-tooling-test",
      "console-probe-test",
      "performance-harness-test",
      "writing-evaluator-test"
    ],
    "full": true
  }
};
export const DOC_BASE = ['ci-invariants','ci-plan-test'];
export const BASE = ['ci-invariants','design-lint','token-parity-test','component-contract-test','smoke-test','ci-plan-test','ci-tooling-test','browser-fixture-test'];
