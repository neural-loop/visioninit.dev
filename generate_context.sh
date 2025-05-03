#!/bin/bash

# --- Configuration ---
FULL_OUTPUT_FILE="tmp/output.txt" # Checkpoint file
DIFF_OUTPUT_FILE="tmp/diff_output.txt" # File for changed context
PROJECT_ROOT="." # Run from your project's root directory
MODE="" # 'full' or 'diff'

# --- Helper Function for Logging ---
log() {
  echo "[CONTEXT GEN] $1"
}

# --- Usage Instructions ---
usage() {
  echo "Usage: $0 [-f | --full] | [-d | --diff]"
  echo "  -f, --full: Generate the full project context checkpoint (${FULL_OUTPUT_FILE})."
  echo "  -d, --diff: Generate a context file (${DIFF_OUTPUT_FILE}) with only files modified since the last full checkpoint."
  exit 1
}

# --- Argument Parsing ---
if [ "$#" -ne 1 ]; then
  usage
fi

case "$1" in
  -f|--full)
    MODE="full"
    TARGET_OUTPUT_FILE="$FULL_OUTPUT_FILE"
    log "Mode: Generating FULL context checkpoint -> ${TARGET_OUTPUT_FILE}"
    ;;
  -d|--diff)
    MODE="diff"
    TARGET_OUTPUT_FILE="$DIFF_OUTPUT_FILE"
    log "Mode: Generating DIFF context based on ${FULL_OUTPUT_FILE} -> ${TARGET_OUTPUT_FILE}"
    ;;
  *)
    log "Error: Invalid option '$1'"
    usage
    ;;
esac

# --- Check for Checkpoint File in Diff Mode ---
if [ "$MODE" = "diff" ] && [ ! -f "$FULL_OUTPUT_FILE" ]; then
  log "Error: Checkpoint file '${FULL_OUTPUT_FILE}' not found."
  log "Please run with -f or --full first to create the checkpoint."
  exit 1
fi

# --- Ensure Output Directory Exists ---
OUTPUT_DIR=$(dirname "$TARGET_OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR" || { log "Error: Could not create output directory ${OUTPUT_DIR}"; exit 1; }


# --- Generate Header ---
log "Generating header for $TARGET_OUTPUT_FILE..."
generate_header() {
  local output_file="$1"
  local mode="$2"
  local checkpoint_file="$3"
  local checkpoint_timestamp=""

  # Clear the file first
  >"$output_file"

  if [ "$mode" = "diff" ]; then
    # Checkpoint file existence already verified earlier
    checkpoint_timestamp=$(date -r "$checkpoint_file")
    cat >> "$output_file" << EOL
--- START OF PROJECT CONTEXT UPDATE for VisionInit Website ---

This file contains ONLY the content of key files that have been MODIFIED since the last full context checkpoint was generated.

**Checkpoint File:** ${checkpoint_file}
**Checkpoint Timestamp:** ${checkpoint_timestamp}

**Instructions for AI:**
1.  **Apply Updates:** Use the content below to update your understanding of the project based on the changes since the checkpoint timestamp.
2.  **Focus on Changes:** These files represent recent modifications. Prioritize this information when it conflicts with previous context from the full checkpoint.
3.  **Context is Limited:** Remember this is NOT the full project, only the changed files. Refer back to the full checkpoint (${checkpoint_file}) if needed for unchanged files or broader structure.
4.  **File Identification:** Each file's content is preceded by '=== [relative/path/to/file.ext] ==='.
5.  Provide Code with focus toward with minimal commenting and focus towards simplicity of copying and replacing within the IDE.
--- MODIFIED FILE CONTENTS START ---
EOL
  else # mode == "full"
    cat >> "$output_file" << EOL
--- START OF PROJECT CONTEXT for VisionInit Website (Full Checkpoint) ---

This file contains the content of key configuration, source code, layout, and content files for the VisionInit Hugo website project (visioninit.dev). This serves as a full checkpoint.

**Instructions for AI:**
1.  **Analyze Structure:** Understand the Hugo project layout (config, content, layouts, assets, static structure).
2.  **Focus on Code/Config:** Pay close attention to Hugo templates (.html), SCSS (.scss), JavaScript (.js), configuration files (.toml, .yaml, .json), Go module files (go.mod, go.sum), and Node config (package.json, package-lock.json).
3.  **Understand Content:** Review markdown content files (.md) for site text and structure.
4.  **Identify Customizations:** Note custom logic in layouts, partials, shortcodes, SCSS, and JS compared to standard Hugo/theme practices.
5.  **Note Dependencies:** Identify key dependencies from go.mod/go.sum and package.json.
6.  **Ignore Irrelevant Data:** Skip over binary data representations or verbose dependency code if accidentally included. The file list provided *before* this context might be inaccurate due to excluded directories like .git, node_modules, static assets, tmp, etc. Focus on the content provided below.
7.  **Primary Goal:** Use this information to answer questions about the website's implementation, structure, features, styling, configuration, and potential areas for improvement or troubleshooting.
8.  Provide Code with focus toward with minimal commenting and focus towards simplicity of copying and replacing within the IDE.
--- FILE CONTENTS START ---
EOL
  fi
}

generate_header "$TARGET_OUTPUT_FILE" "$MODE" "$FULL_OUTPUT_FILE"


# --- Base Find Command Parts ---
# Excluded paths and names
# IMPORTANT: Ensure these paths are relative to PROJECT_ROOT or use absolute paths
# Using find's path directly is usually best.
PRUNE_PATHS=(
  # Use path relative to find's starting point ($PROJECT_ROOT)
  "$PROJECT_ROOT/.git"
  "$PROJECT_ROOT/node_modules"
  "$PROJECT_ROOT/tmp"
  "$PROJECT_ROOT/assets/images"
  "$PROJECT_ROOT/assets/source-assets"
  "$PROJECT_ROOT/static" # Often contains large generated or vendor assets
  "$PROJECT_ROOT/.idea"
  "$PROJECT_ROOT/.vscode"
  "$PROJECT_ROOT/public"  # Hugo output directory
  "$PROJECT_ROOT/resources" # Hugo generated assets cache
)
PRUNE_NAMES=(
  # Use -name for specific filenames, regardless of path
  "$(basename "$FULL_OUTPUT_FILE")" # Match filename only
  "$(basename "$DIFF_OUTPUT_FILE")" # Match filename only
  ".DS_Store"
  "hugo_stats.json"
  ".hugo_build.lock"
)

# Build the prune clause dynamically
PRUNE_CLAUSE=""
for p in "${PRUNE_PATHS[@]}"; do
    PRUNE_CLAUSE+="-path $p -o "
done
for n in "${PRUNE_NAMES[@]}"; do
    PRUNE_CLAUSE+="-name $n -o "
done
# Remove the trailing " -o "
PRUNE_CLAUSE=${PRUNE_CLAUSE%???}


# Included file patterns (using -iname for case-insensitivity)
INCLUDE_PATTERNS=(
  '*.html'
  '*.md'
  '*.toml'
  '*.json'
  '*.ya?ml' # Matches .yaml and .yml
  '*.scss'
  '*.js'
  '*.php'
  '*.py'
  '*.sh'
  '.gitignore'
  'Dockerfile'
  'LICENSE'
  'README.md'
  'go.mod'
  'go.sum'
  'package.json'
  'package-lock.json'
  'nginx.conf'
)
# Build the include clause dynamically
INCLUDE_CLAUSE=""
for pattern in "${INCLUDE_PATTERNS[@]}"; do
    INCLUDE_CLAUSE+="-iname $pattern -o "
done
# Remove the trailing " -o "
INCLUDE_CLAUSE=${INCLUDE_CLAUSE%???}


# --- Find and Append Files ---
log "Finding and appending relevant file contents..."

# Base find command
FIND_CMD_ARRAY=(find "$PROJECT_ROOT")

# Add pruning for excluded paths/files
# Use \( ... \) for grouping, ensuring parens are passed as separate arguments
FIND_CMD_ARRAY+=(\( $PRUNE_CLAUSE \) -prune -o)

# Add condition for modified files in diff mode
if [ "$MODE" = "diff" ]; then
  log "Filtering for files newer than ${FULL_OUTPUT_FILE}..."
  # Ensure the reference file exists before adding -newer
  if [ -f "$FULL_OUTPUT_FILE" ]; then
      FIND_CMD_ARRAY+=(-newer "$FULL_OUTPUT_FILE")
  else
      log "Warning: Checkpoint file $FULL_OUTPUT_FILE not found for -newer comparison. Proceeding without time filter."
      # Or exit 1 here if this is critical for diff mode
  fi
fi

# Add file type selections and execution
# Use \( ... \) for grouping include patterns
FIND_CMD_ARRAY+=(\( $INCLUDE_CLAUSE \) -type f -exec sh -c '
  output_file="$1"
  project_root="$2"
  shift 2 # Remove output_file and project_root from arguments, leaving only found files ($@)

  processed_count=0
  for f do
#     DEBUG: Print the file being processed by the inline shell
     echo "[DEBUG EXEC] Processing: $f"

    # Use relative path for header, removing leading PROJECT_ROOT/ if present
    relative_path="${f#$project_root/}"
    # If project_root is ".", f might start with "./", remove that too
    relative_path="${relative_path#./}"

    echo "" >> "$output_file"
    echo "=== ${relative_path} ===" >> "$output_file"
    # Use cat, append output, handle errors by appending error message
    if cat "$f" >> "$output_file"; then
      : # Success, do nothing extra
    else
      echo "--- FAILED TO CAT ${relative_path} ---" >> "$output_file"
    fi
    processed_count=$((processed_count + 1))
  done
  # DEBUG: Print how many files the inline shell processed
   echo "[DEBUG EXEC] Processed $processed_count files."

' sh "$TARGET_OUTPUT_FILE" "$PROJECT_ROOT" {} +)

# --- Execute the Find Command ---
log "Constructed find command:"
# Print array elements quoted for clarity, resembles how shell interprets it
printf "%q " "${FIND_CMD_ARRAY[@]}"
echo "" # Newline after printing command

log "Executing find command..."
# Execute the command from the array. No eval needed if parens are separate args.
if "${FIND_CMD_ARRAY[@]}"; then
    log "Find command executed successfully."
else
    log "Find command failed with exit code $?."
    # Optionally exit here if find failure is critical
    # exit 1
fi


# --- Add Footer ---
log "Adding footer to $TARGET_OUTPUT_FILE..."
generate_footer() {
    local output_file="$1"
    local mode="$2"
    local footer_text="--- END OF PROJECT CONTEXT ---"

    if [ "$mode" = "diff" ]; then
        footer_text="--- END OF PROJECT CONTEXT UPDATE ---"
    fi

    # Check if the file is empty other than the header (implies find failed or found nothing)
    # Get size, subtract estimated header size (adjust if headers change significantly)
    local content_start_marker="--- FILE CONTENTS START ---"
    if [ "$mode" = "diff" ]; then
        content_start_marker="--- MODIFIED FILE CONTENTS START ---"
    fi

    # Check if the content start marker is the last line (ignoring potential trailing newline)
    # This is a bit heuristic but better than just checking size
    local last_line
    last_line=$(tail -n 1 "$output_file")
    local second_last_line
    second_last_line=$(tail -n 2 "$output_file" | head -n 1)

    if [[ "$last_line" == "$content_start_marker" || ( -z "$last_line" && "$second_last_line" == "$content_start_marker" ) ]]; then
        log "Warning: No files seem to have been added to the context file."
    fi


    echo "" >> "$output_file" # Ensure newline before footer
    echo "$footer_text" >> "$output_file"
}

generate_footer "$TARGET_OUTPUT_FILE" "$MODE"

# Final check on file size
file_size=$(wc -c < "$TARGET_OUTPUT_FILE")
log "Successfully generated context file: $TARGET_OUTPUT_FILE (${file_size} bytes)"

# Add a check for very small file size as a potential indicator of issues
if [ "$file_size" -lt 1000 ] && [ "$MODE" = "full" ]; then # Adjust threshold as needed
    log "Warning: The generated full context file is very small. Please verify its contents."
fi
if [ "$file_size" -lt 500 ] && [ "$MODE" = "diff" ]; then # Adjust threshold as needed
    log "Warning: The generated diff context file is very small. This might be expected if few files changed."
fi
