const { join } = require('path');
const { readdir, readFile, writeFile, unlink, stat } = require('fs/promises');
const { execSync } = require('child_process');

// --- Configuration ---
const CONTENT_ROOT_DIR = join(process.cwd(), 'content', 'english');
const TEMPLATE_PATH = join(
  process.cwd(),
  'assets',
  'og-template',
  'template.html'
);
const LOGO_PATH_RELATIVE_TO_ROOT = 'assets/images/logo-source.png';
const SITE_NAME = 'https://visioninit.dev'; // Your site's name or domain
const OUTPUT_FILENAME = 'og.png';
const TEMP_HTML_FILENAME = 'temp-og.html';
const DEBUG = true; // Set to false to reduce console output

// --- Helper Functions ---
function debugLog(...messages) {
  if (DEBUG) console.log('[DEBUG]', ...messages);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err; // Re-throw other errors
  }
}

async function isDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}

async function findMarkdownFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch (err) {
    console.warn(`Could not read directory ${dir}: ${err.message}`);
    return [];
  }

  const markdownFiles = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (await isDirectory(fullPath)) {
      const nestedFiles = await findMarkdownFiles(fullPath);
      markdownFiles.push(...nestedFiles);
    } else if (entry === 'index.md' || entry === '_index.md') {
      markdownFiles.push(fullPath);
    }
  }
  return markdownFiles;
}

/**
 * Extracts title, description, and draft status from Markdown front matter.
 * @param {string} content Markdown file content.
 * @returns {{title: string|null, description: string|null, isDraft: boolean}}
 */
function extractFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
  let title = null;
  let description = null;
  let isDraft = false;

  if (frontMatterMatch && frontMatterMatch[1]) {
    const frontMatterContent = frontMatterMatch[1];
    const titleMatch = frontMatterContent.match(
      /^(?:title|Title):\s*["']?(.*?)["']?\s*$/m
    );
    // Look for description, allow multi-line descriptions enclosed in quotes or basic single line
    const descriptionMatch = frontMatterContent.match(
      /^(?:description|Description):\s*["']?([\s\S]*?)["']?\s*$/m
    );
    const draftMatch = frontMatterContent.match(/^draft:\s*(true)\s*$/m);

    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim().replace(/\\"/g, '"'); // Handle escaped quotes
    }
    if (descriptionMatch && descriptionMatch[1]) {
      // Remove potential leading/trailing quotes and trim whitespace heavily
      description = descriptionMatch[1]
        .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\\"/g, '"') // Handle escaped quotes
        .trim();
    }
    if (draftMatch) {
      isDraft = true;
    }
  }
  return { title, description, isDraft };
}

/**
 * Reads an image file and returns a base64 data URI.
 * @param {string} filePath Absolute path to the image file.
 * @returns {Promise<string|null>} Data URI string or null on error.
 */
async function getImageDataUri(filePath) {
  try {
    const imageBuffer = await readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = require('mime-types').lookup(filePath) || 'image/png'; // Default to png
    return `data:${mimeType};base64,${base64Image}`;
  } catch (err) {
    console.error(`❌ Error reading logo file at ${filePath}: ${err.message}`);
    return null; // Return null if logo can't be read
  }
}

// --- Main Generation Logic ---
async function generateOGImages() {
  const absoluteLogoPath = join(process.cwd(), LOGO_PATH_RELATIVE_TO_ROOT);
  let logoDataUri = null;

  // Pre-read and encode the logo
  debugLog(`Attempting to load logo from: ${absoluteLogoPath}`);
  if (await pathExists(absoluteLogoPath)) {
    logoDataUri = await getImageDataUri(absoluteLogoPath);
    if (logoDataUri) {
      debugLog(`Logo loaded and encoded successfully.`);
    } else {
      console.warn(
        `⚠️ Warning: Could not load or encode logo. OG images will be generated without it.`
      );
    }
  } else {
    console.warn(
      `⚠️ Warning: Logo file not found at ${absoluteLogoPath}. OG images will be generated without it.`
    );
  }

  try {
    // 1. Verify content dir and template exist
    debugLog(`Content directory: ${CONTENT_ROOT_DIR}`);
    debugLog(`Template path: ${TEMPLATE_PATH}`);
    if (!(await pathExists(CONTENT_ROOT_DIR))) {
      /* ... */
    } // Existing checks...
    if (!(await pathExists(TEMPLATE_PATH))) {
      /* ... */
    }

    // 2. Find markdown files
    debugLog('Searching for index.md and _index.md files...');
    const markdownFiles = await findMarkdownFiles(CONTENT_ROOT_DIR);
    debugLog(`Found ${markdownFiles.length} potential markdown files`);
    if (markdownFiles.length === 0) {
      /* ... */ return;
    }

    debugLog('Reading template file...');
    const template = await readFile(TEMPLATE_PATH, 'utf8');
    debugLog('Template loaded successfully.');

    // 3. Process each markdown file
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const mdFile of markdownFiles) {
      const pageDirectory = join(mdFile, '..');
      const tempHtmlPath = join(pageDirectory, TEMP_HTML_FILENAME);
      const outputPath = join(pageDirectory, OUTPUT_FILENAME);

      try {
        debugLog(`\nProcessing file: ${mdFile}`);
        const mdContent = await readFile(mdFile, 'utf8');
        const { title, description, isDraft } = extractFrontMatter(mdContent);

        if (isDraft) {
          debugLog(`Skipping draft page: "${title || mdFile}"`);
          skippedCount++;
          continue;
        }
        if (!title) {
          debugLog(`No title found in ${mdFile}, skipping...`);
          skippedCount++;
          continue;
        }
        if (!description) {
          // <<< Check for description
          debugLog(`No description found in ${mdFile}, skipping...`);
          skippedCount++;
          continue;
        }

        debugLog(`Page title: "${title}"`);
        debugLog(`Page description: "${description.substring(0, 50)}..."`); // Log snippet
        debugLog(`Output will be saved to: ${outputPath}`);

        // Prepare HTML content - replacing all placeholders
        const htmlContent = template
          .replace('LOGO_SRC', logoDataUri || '') // Use encoded logo or empty string
          .replace('PAGE_TITLE', title)
          .replace('PAGE_DESCRIPTION', description)
          .replace('SITE_NAME', SITE_NAME);

        // Create temp HTML file
        debugLog(`Creating temp HTML file: ${tempHtmlPath}`);
        await writeFile(tempHtmlPath, htmlContent);

        // Generate image
        const command = `wkhtmltoimage --quality 80 --width 1200 --height 630 "${tempHtmlPath}" "${outputPath}"`;
        debugLog(`Executing: ${command}`);

        execSync(command);
        console.log(`✅ Generated OG image for: "${title}" (${mdFile})`);
        successCount++;

        // Clean up temp file
        debugLog(`Removing temp file: ${tempHtmlPath}`);
        await unlink(tempHtmlPath);
      } catch (err) {
        // ... (existing error handling) ...
        console.error(`❌ Failed processing ${mdFile}:`, err.message);
        debugLog('Full error:', err);
        errorCount++;
        // Attempt cleanup even on error
        if (await pathExists(tempHtmlPath)) {
          try {
            await unlink(tempHtmlPath);
          } catch (cleanupErr) {
            /* Ignore cleanup error */
          }
        }
      }
    }

    console.log('\n✨ OG image generation complete!');
    console.log(
      `📊 Summary: ${successCount} generated, ${skippedCount} skipped, ${errorCount} errors.`
    );
  } catch (err) {
    // ... (existing error handling) ...
    console.error('\n🔥 Critical error during script execution:', err.message);
    debugLog('Full error:', err);
    process.exit(1);
  }
}

// --- Execution ---
// Check if wkhtmltoimage and mime-types are installed
try {
  require.resolve('mime-types'); // Check if mime-types is installed
  debugLog('mime-types package is available.');
  try {
    execSync('wkhtmltoimage --version', { stdio: 'ignore' });
    debugLog('wkhtmltoimage is available.');
    generateOGImages();
  } catch (e) {
    console.error('\n❌ wkhtmltoimage is not installed or not in your PATH!');
    // ... (existing wkhtmltoimage error messages) ...
    process.exit(1);
  }
} catch (e) {
  console.error('\n❌ Required package `mime-types` is not installed.');
  console.error('   Please install it by running: npm install mime-types');
  process.exit(1);
}
