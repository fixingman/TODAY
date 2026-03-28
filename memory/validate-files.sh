#!/bin/bash
# Validates that all memory/*.md files are referenced in Rules.md File Guide
# Run: bash memory/validate-files.sh

RULES="memory/Rules.md"
MEMORY_DIR="memory"

echo "=== Memory File Validation ==="
echo ""

# Get all .md files in memory (excluding Rules.md itself)
FILES=$(find "$MEMORY_DIR" -name "*.md" -type f | grep -v "Rules.md" | sort)

MISSING=()
for f in $FILES; do
  # Get relative path from memory/ (e.g., "research/Quick-capture.md")
  REL_PATH="${f#memory/}"
  
  # Check if it's referenced in Rules.md
  if ! grep -q "$REL_PATH" "$RULES"; then
    MISSING+=("$REL_PATH")
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "✅ All memory files are in File Guide"
else
  echo "❌ Missing from File Guide in Rules.md:"
  for m in "${MISSING[@]}"; do
    echo "   - $m"
  done
  echo ""
  echo "Add these to the File Guide table in Rules.md"
fi

echo ""
echo "=== Current memory files ==="
find "$MEMORY_DIR" -name "*.md" -type f | sort | sed 's|memory/|  |'
