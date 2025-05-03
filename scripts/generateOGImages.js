const { join } = require('path');
const { readdir, readFile, writeFile, unlink, stat, mkdir } = require('fs/promises');
const { execSync } = require('child_process');

// --- Configuration ---
const CONTENT_ROOT_DIR = join(process.cwd(), 'content');
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

const VARIABLES_SCSS_PATH = join(process.cwd(), 'assets', 'scss', '_variables.scss');
const DEFAULT_PRIMARY_COLOR = '#748091'; // Fallback color if reading fails
const STATIC_DIR = join(process.cwd(), 'static');
const HOMEPAGE_OUTPUT_PATH = join(STATIC_DIR, 'og.png'); // Output to static root
const HOMEPAGE_TEMP_HTML_PATH = join(process.cwd(), 'temp-homepage-og.html'); // Temp file in project root
// ** IMPORTANT: Get these values from config/_default/config.toml **
const HOMEPAGE_TITLE = "VisionInit - Professional IT Services & Solutions";
const HOMEPAGE_DESCRIPTION = "Expert IT consultancy: Full-stack web development, cloud solutions, and web security assessments. Partner with Justin Riddiough for technical solutions.";

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
 * Removes trailing comments (#...) from title and description lines *after* capture.
 * Handles optional quotes around values correctly.
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

    const titleRegex = /^(?:title|Title):\s*(.*)\s*$/m;
    const descriptionRegex = /^(?:description|Description):\s*([\s\S]*?)\s*$/m;

    const titleMatch = frontMatterContent.match(titleRegex);
    const descriptionMatch = frontMatterContent.match(descriptionRegex);
    const draftMatch = frontMatterContent.match(/^draft:\s*(true)\s*$/m);

    if (titleMatch && titleMatch[1]) {
      let rawValue = titleMatch[1];
      // 1. Remove trailing comment first
      rawValue = rawValue.split('#')[0].trim();
      // 2. Remove surrounding quotes (double or single)
      if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
        rawValue = rawValue.substring(1, rawValue.length - 1);
      }
      // 3. Handle escaped quotes *after* removing delimiters
      title = rawValue.replace(/\\"/g, '"').replace(/\\'/g, "'").trim(); // Added final trim
    }

    if (descriptionMatch && descriptionMatch[1]) {
      let rawValue = descriptionMatch[1];

      // --- START Corrected Description Handling ---
      // 1. Handle escaped quotes FIRST to preserve internal characters
      rawValue = rawValue.replace(/\\"/g, '"').replace(/\\'/g, "'");

      // 2. Remove trailing comments (handle multi-line safely)
      const lines = rawValue.split('\n');
      if (lines.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1].split('#')[0]; // Remove comment from last line
      }
      rawValue = lines.join(' ').replace(/\s+/g, ' ').trim(); // Join, collapse whitespace, trim

      // 3. Remove surrounding quotes NOW from the cleaned, single-line value
      if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
        rawValue = rawValue.substring(1, rawValue.length - 1);
      }

      description = rawValue.trim(); // Final trim just in case
      // --- END Corrected Description Handling ---
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

/**
 * Reads _variables.scss and extracts the $primary-color value.
 * @returns {Promise<string>} The primary color hex code or a default.
 */
async function getPrimaryColorFromScss() {
  try {
    debugLog(`Attempting to read primary color from: ${VARIABLES_SCSS_PATH}`);
    if (!(await pathExists(VARIABLES_SCSS_PATH))) {
      console.warn(`⚠️ SCSS variables file not found at ${VARIABLES_SCSS_PATH}. Using default color.`);
      return DEFAULT_PRIMARY_COLOR;
    }

    const scssContent = await readFile(VARIABLES_SCSS_PATH, 'utf8');
    // Regex to find $primary-color: #XXXXXX; (allows 3 or 6 hex chars)
    const colorMatch = scssContent.match(/^\$primary-color:\s*(#[0-9a-fA-F]{3,6})\s*;/m);

    if (colorMatch && colorMatch[1]) {
      debugLog(`Found primary color: ${colorMatch[1]}`);
      return colorMatch[1];
    } else {
      console.warn(`⚠️ Could not find $primary-color definition in ${VARIABLES_SCSS_PATH}. Using default color.`);
      return DEFAULT_PRIMARY_COLOR;
    }
  } catch (err) {
    console.error(`❌ Error reading or parsing ${VARIABLES_SCSS_PATH}: ${err.message}`);
    console.warn(`Using default primary color: ${DEFAULT_PRIMARY_COLOR}`);
    return DEFAULT_PRIMARY_COLOR;
  }
}
// --- Main Generation Logic ---
async function generateOGImages() {
  const absoluteLogoPath = join(process.cwd(), LOGO_PATH_RELATIVE_TO_ROOT);
  let logoDataUri = null;

  // Pre-read and encode the logo (existing logic - unchanged)
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
    // 1. Verify content dir and template exist (existing logic - unchanged)
    debugLog(`Content directory: ${CONTENT_ROOT_DIR}`);
    debugLog(`Template path: ${TEMPLATE_PATH}`);
    if (!(await pathExists(CONTENT_ROOT_DIR))) {
      console.error(`❌ Error: Content directory not found at ${CONTENT_ROOT_DIR}`);
      process.exit(1);
    }
    if (!(await pathExists(TEMPLATE_PATH))) {
      console.error(`❌ Error: OG template not found at ${TEMPLATE_PATH}`);
      process.exit(1);
    }

    // 2. Find markdown files (existing logic - unchanged)
    debugLog('Searching for index.md and _index.md files...');
    const markdownFiles = await findMarkdownFiles(CONTENT_ROOT_DIR);
    debugLog(`Found ${markdownFiles.length} potential markdown files for content pages.`);

    debugLog('Reading template file...');
    const template = await readFile(TEMPLATE_PATH, 'utf8');
    debugLog('Template loaded successfully.');

    // 3. Process each markdown file (existing loop - unchanged)
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const mdFile of markdownFiles) {
      const pageDirectory = join(mdFile, '..');
      const tempHtmlPath = join(pageDirectory, TEMP_HTML_FILENAME);
      const outputPath = join(pageDirectory, OUTPUT_FILENAME);

      try {
        debugLog(`\nProcessing content file: ${mdFile}`);
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
          debugLog(`No description found in ${mdFile}, skipping...`);
          skippedCount++;
          continue;
        }

        debugLog(`Page title: "${title}"`);
        debugLog(`Page description: "${description.substring(0, 50)}..."`);
        debugLog(`Output will be saved to: ${outputPath}`);

        const htmlContent = template
          .replace('LOGO_SRC', logoDataUri || '')
          .replace('PAGE_TITLE', title)
          .replace('PAGE_DESCRIPTION', description)
          .replace('SITE_NAME', SITE_NAME);

        debugLog(`Creating temp HTML file: ${tempHtmlPath}`);
        await writeFile(tempHtmlPath, htmlContent);

        const command = `wkhtmltoimage --quality 80 --width 1200 --height 630 "${tempHtmlPath}" "${outputPath}"`;
        debugLog(`Executing: ${command}`);

        execSync(command);
        console.log(`✅ Generated content OG image for: "${title}" (${mdFile})`);
        successCount++;

        debugLog(`Removing temp file: ${tempHtmlPath}`);
        await unlink(tempHtmlPath);
      } catch (err) {
        console.error(`❌ Failed processing ${mdFile}:`, err.message);
        debugLog('Full error:', err);
        errorCount++;
        if (await pathExists(tempHtmlPath)) {
          try { await unlink(tempHtmlPath); } catch (cleanupErr) { /* Ignore */ }
        }
      }
    } // --- End of Markdown file loop ---

    // --- START: Homepage Generation ---
    console.log('\n🚀 Generating OG image for Homepage...');
    try {
      if (!HOMEPAGE_TITLE || !HOMEPAGE_DESCRIPTION) {
        console.warn('⚠️ Skipping homepage OG: Title or Description is missing in script constants.');
        skippedCount++;
      } else {
        await ensureDir(STATIC_DIR); // Ensure static dir exists

        debugLog(`Homepage title: "${HOMEPAGE_TITLE}"`);
        debugLog(`Homepage description: "${HOMEPAGE_DESCRIPTION.substring(0, 50)}..."`);
        debugLog(`Output will be saved to: ${HOMEPAGE_OUTPUT_PATH}`);

        const homepageHtmlContent = template
          .replace('LOGO_SRC', logoDataUri || '')
          .replace('PAGE_TITLE', HOMEPAGE_TITLE)
          .replace('PAGE_DESCRIPTION', HOMEPAGE_DESCRIPTION)
          .replace('SITE_NAME', SITE_NAME);

        debugLog(`Creating temp HTML file: ${HOMEPAGE_TEMP_HTML_PATH}`);
        await writeFile(HOMEPAGE_TEMP_HTML_PATH, homepageHtmlContent);

        const command = `wkhtmltoimage --quality 90 --width 1200 --height 630 "${HOMEPAGE_TEMP_HTML_PATH}" "${HOMEPAGE_OUTPUT_PATH}"`;
        debugLog(`Executing: ${command}`);

        execSync(command);
        console.log(`✅ Generated homepage OG image! (${HOMEPAGE_OUTPUT_PATH})`);
        successCount++; // Increment success count

        debugLog(`Removing temp file: ${HOMEPAGE_TEMP_HTML_PATH}`);
        await unlink(HOMEPAGE_TEMP_HTML_PATH);
      }
    } catch (err) {
      console.error(`❌ Failed processing Homepage:`, err.message);
      debugLog('Full error:', err);
      errorCount++;
      // Attempt cleanup even on error
      if (await pathExists(HOMEPAGE_TEMP_HTML_PATH)) {
        try { await unlink(HOMEPAGE_TEMP_HTML_PATH); } catch (cleanupErr) { /* Ignore */ }
      }
    }
    // --- END: Homepage Generation ---


    console.log('\n✨ OG image generation complete!');
    console.log(
      `📊 Summary: ${successCount} generated, ${skippedCount} skipped, ${errorCount} errors.`
    );
  } catch (err) {
    console.error('\n🔥 Critical error during script execution:', err.message);
    debugLog('Full error:', err);
    process.exit(1);
  }
}

// --- Helper function ensureDir (Add this if it doesn't exist) ---
async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
    debugLog(`Directory ensured: ${dirPath}`);
  } catch (err) {
    if (err.code !== 'EEXIST') { // Ignore if directory already exists
      throw err;
    }
    debugLog(`Directory already exists: ${dirPath}`);
  }
}

// ... (rest of the script, including the final execution wrapper) ...
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
