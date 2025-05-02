#!/bin/bash

# --- Configuration ---
OUTPUT_FILE="tmp/output.txt"
PROJECT_ROOT="." # Run from your project's root directory

# --- Helper Function for Logging ---
log() {
  echo "[CONTEXT GEN] $1"
}

# --- Generate Header ---
log "Generating header for $OUTPUT_FILE..."
cat > "$OUTPUT_FILE" << EOL
--- START OF PROJECT CONTEXT for VisionInit Website ---

This file contains the content of key configuration, source code, layout, and content files for the VisionInit Hugo website project (visioninit.dev).

**Instructions for AI:**
1.  **Analyze Structure:** Understand the Hugo project layout (config, content, layouts, assets, static structure).
2.  **Focus on Code/Config:** Pay close attention to Hugo templates (.html), SCSS (.scss), JavaScript (.js), configuration files (.toml, .yaml, .json), Go module files (go.mod, go.sum), and Node config (package.json, package-lock.json).
3.  **Understand Content:** Review markdown content files (.md) for site text and structure.
4.  **Identify Customizations:** Note custom logic in layouts, partials, shortcodes, SCSS, and JS compared to standard Hugo/theme practices.
5.  **Note Dependencies:** Identify key dependencies from go.mod/go.sum and package.json.
6.  **Ignore Irrelevant Data:** Skip over binary data representations or verbose dependency code if accidentally included. The file list provided *before* this context might be inaccurate due to excluded directories like .git, node_modules, static assets, tmp, etc. Focus on the content provided below.
7.  **Primary Goal:** Use this information to answer questions about the website's implementation, structure, features, styling, configuration, and potential areas for improvement or troubleshooting.

--- FILE CONTENTS START ---
EOL

# --- Find and Append Files ---
log "Finding and appending relevant file contents..."
find "$PROJECT_ROOT" \( \
  -path "$PROJECT_ROOT/.git" -o \
  -path "$PROJECT_ROOT/node_modules" -o \
  -path "$PROJECT_ROOT/tmp" -o \
  -path "$PROJECT_ROOT/assets/images" -o \
  -path "$PROJECT_ROOT/assets/source-assets" -o \
  -path "$PROJECT_ROOT/static" -o \
  -path "$PROJECT_ROOT/.idea" -o \
  -path "$PROJECT_ROOT/.vscode" -o \
  -path "$PROJECT_ROOT/public" -o \
  -name "$OUTPUT_FILE" -o \
  -name ".DS_Store" -o \
  -name "hugo_stats.json" -o \
  -name ".hugo_build.lock" \
\) -prune -o \( \
  -iname '*.html' -o \
  -iname '*.md' -o \
  -iname '*.toml' -o \
  -iname '*.json' -o \
  -iname '*.ya?ml' -o \
  -iname '*.scss' -o \
  -iname '*.js' -o \
  -iname '*.php' -o \
  -iname '*.py' -o \
  -iname '*.sh' -o \
  -iname '.gitignore' -o \
  -iname 'Dockerfile' -o \
  -iname 'LICENSE' -o \
  -iname 'README.md' -o \
  -iname 'go.mod' -o \
  -iname 'go.sum' -o \
  -iname 'package.json' -o \
  -iname 'package-lock.json' -o \
  -iname 'nginx.conf' \
\) -type f -exec sh -c '
  for f do
    # Use relative path for header, removing leading PROJECT_ROOT/ if present
    relative_path="${f#$1/}" # Using $1 which is PROJECT_ROOT
    echo "" >> "$2" # Use $2 which is OUTPUT_FILE
    echo "=== ${relative_path} ===" >> "$2"
    # Use cat, append output, handle errors by appending error message
    cat "$f" >> "$2" || echo "--- FAILED TO CAT ${relative_path} ---" >> "$2"
  done
' sh "$PROJECT_ROOT" "$OUTPUT_FILE" {} +

# --- Add Footer ---
echo "" >> "$OUTPUT_FILE" # Ensure newline before footer
echo "--- END OF PROJECT CONTEXT ---" >> "$OUTPUT_FILE"

log "Successfully generated context file: $OUTPUT_FILE"
