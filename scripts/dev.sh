#!/usr/bin/env bash
set -eu

# Select the repository's existing CI runtime for this command only.
task_scripts="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
task_version="$(sed -nE "s/^[[:space:]]*node-version: '([0-9.]+)'.*/\1/p" "$task_scripts/../.github/workflows/test.yml")"
test -n "$task_version" || { echo 'Cannot read the CI Node version.' >&2; exit 1; }
for task_node in "$(command -v node || true)" "${NVM_DIR:-$HOME/.nvm}"/versions/node/v*/bin/node; do
  if test -x "$task_node" && test "$("$task_node" --version)" = "v$task_version"; then
    export PATH="$(dirname -- "$task_node"):$PATH"
    exec "$task_node" "$task_scripts/workspace-tools.mjs" "$@"
  fi
done
echo "Node $task_version is required. Activate that existing runtime or install it with your usual Node manager." >&2
exit 1
