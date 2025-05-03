// scripts/collectOgData.js
const { join } = require('path');
const { readdir, readFile, stat, mkdir, writeFile } = require('fs/promises');
const toml = require('toml');

// --- Configuration ---
const PROJECT_ROOT = process.cwd();
const CONTENT_ROOT_DIR = join(PROJECT_ROOT, 'content');
const DEFAULT_CONFIG_PATH = join(PROJECT_ROOT, 'config', '_default', 'config.toml');
const PROD_CONFIG_PATH = join(PROJECT_ROOT, 'config', 'production', 'config.toml'); // << READ PROD CONFIG
const VARIABLES_SCSS_PATH = join(PROJECT_ROOT, 'assets', 'scss', '_variables.scss');
const LOGO_PATH_RELATIVE_TO_ROOT = 'assets/images/logo-source.png';
const STATIC_DIR = join(PROJECT_ROOT, 'static');
const TMP_DIR = join(PROJECT_ROOT, 'tmp');
const OUTPUT_JSON_PATH = join(TMP_DIR, 'ogImageData.json');
const DEBUG = false;

// Colors to extract from SCSS
const COLORS_TO_EXTRACT = [
  'primary-color',
  'primary-contrast-color',
  'secondary-color',
  'text-color',
  'text-color-light',
  'dark-accent',
  'text-color-dark',
  'body-color',
  'border-color',
  'black',
  'white',
  'light',
  'gray',
  'text-lighten',
];
const DEFAULT_COLORS = { // Fallbacks if SCSS parsing fails
  'primary-color': '#748091',
  'text-color-dark': '#1e1e4b',
  'text-color': '#5c5c77',
  // Add other essential fallbacks if needed
};


// --- Helper Functions ---
function debugLog(...messages) {
  if (DEBUG) console.log('[DEBUG collectOgData]', ...messages);
}

async function pathExists(path) {
  try { await stat(path); return true; } catch (err) { return err.code !== 'ENOENT'; }
}

async function isDirectory(path) {
  try { return (await stat(path)).isDirectory(); } catch { return false; }
}

async function ensureDir(dirPath) {
  try { await mkdir(dirPath, { recursive: true }); debugLog(`Directory ensured: ${dirPath}`); }
  catch (err) { if (err.code !== 'EEXIST') throw err; debugLog(`Directory already exists: ${dirPath}`); }
}

async function findMarkdownFiles(dir) {
  let entries;
  try { entries = await readdir(dir); } catch (err) { console.warn(`Could not read directory ${dir}: ${err.message}`); return []; }
  const markdownFiles = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (await isDirectory(fullPath)) {
      if (entry.toLowerCase() === 'dev') { debugLog(`Skipping 'dev' directory: ${fullPath}`); continue; }
      const nestedFiles = await findMarkdownFiles(fullPath);
      markdownFiles.push(...nestedFiles);
    } else if (entry === 'index.md' || entry === '_index.md') {
      markdownFiles.push(fullPath);
    }
  }
  return markdownFiles;
}

function extractFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
  let title = null, description = null, isDraft = false, excludeSitemap = false;
  if (frontMatterMatch && frontMatterMatch[1]) {
    const fm = frontMatterMatch[1];
    const titleMatch = fm.match(/^(?:title|Title):\s*(.*)\s*$/m);
    const descMatch = fm.match(/^(?:description|Description):\s*([\s\S]*?)\s*$/m);
    const draftMatch = fm.match(/^draft:\s*(true)\s*$/im);
    const excludeMatch = fm.match(/^exclude_sitemap:\s*(true)\s*$/im);
    if (titleMatch) title = titleMatch[1].split('#')[0].trim().replace(/^['"]|['"]$/g, '').replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
    if (descMatch) {
      let raw = descMatch[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
      const lines = raw.split('\n');
      if (lines.length > 0) lines[lines.length - 1] = lines[lines.length - 1].split('#')[0];
      description = lines.join(' ').replace(/\s+/g, ' ').trim().replace(/^['"]|['"]$/g, '').trim();
    }
    if (draftMatch) isDraft = true;
    if (excludeMatch) excludeSitemap = true;
  }
  return { title, description, isDraft, excludeSitemap };
}

async function getImageDataUri(filePath) {
  try {
    const buffer = await readFile(filePath);
    const base64 = buffer.toString('base64');
    const mime = require('mime-types').lookup(filePath) || 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error(`❌ Error reading image file at ${filePath}: ${err.message}`);
    return null;
  }
}

// --- NEW: Function to read and merge configs ---
async function getMergedHugoConfig() {
  let config = {};
  // Read Default Config
  try {
    debugLog(`Reading default Hugo config from: ${DEFAULT_CONFIG_PATH}`);
    if (await pathExists(DEFAULT_CONFIG_PATH)) {
      const defaultContent = await readFile(DEFAULT_CONFIG_PATH, 'utf8');
      config = toml.parse(defaultContent);
      debugLog(`Default Hugo config parsed.`);
    } else {
      console.warn(`⚠️ Default config file not found at ${DEFAULT_CONFIG_PATH}`);
    }
  } catch (err) {
    console.error(`❌ Error reading/parsing ${DEFAULT_CONFIG_PATH}: ${err.message}`);
    // Continue without default config if it fails
  }

  // Read Production Config and merge (production overrides default)
  try {
    debugLog(`Reading production Hugo config from: ${PROD_CONFIG_PATH}`);
    if (await pathExists(PROD_CONFIG_PATH)) {
      const prodContent = await readFile(PROD_CONFIG_PATH, 'utf8');
      const prodConfig = toml.parse(prodContent);
      debugLog(`Production Hugo config parsed.`);
      // Simple merge (adjust if deep merge needed, e.g., for params)
      config = { ...config, ...prodConfig };
      // Merge params specifically if they exist in both
      if (config.params && prodConfig.params) {
        config.params = { ...config.params, ...prodConfig.params };
      }
      debugLog(`Merged production config over default.`);
    } else {
      console.warn(`⚠️ Production config file not found at ${PROD_CONFIG_PATH}. Using default/base config only.`);
    }
  } catch (err) {
    console.error(`❌ Error reading/parsing ${PROD_CONFIG_PATH}: ${err.message}`);
    console.warn(`Using default/base config only due to production config error.`);
  }

  // Extract needed values
  return {
    siteName: config.title || 'Missing Site Title',
    siteDescription: config.params?.description || 'Missing site description.',
    siteURL: config.URL || null // << Get the URL parameter
  };
}


// --- NEW: Function to get the full color palette ---
async function getPaletteFromScss() {
  const palette = { ...DEFAULT_COLORS }; // Start with defaults
  try {
    debugLog(`Attempting to read SCSS variables from: ${VARIABLES_SCSS_PATH}`);
    if (!(await pathExists(VARIABLES_SCSS_PATH))) {
      console.warn(`⚠️ SCSS variables file not found at ${VARIABLES_SCSS_PATH}. Using default colors.`);
      return palette;
    }
    const scssContent = await readFile(VARIABLES_SCSS_PATH, 'utf8');

    COLORS_TO_EXTRACT.forEach(colorVarName => {
      // Regex to find $color-var-name: #XXXXXX; or rgb(...); etc. Handles comments.
      // It captures the variable name and its value.
      const regex = new RegExp(`^\\$${colorVarName}:\\s*([^;]+?)\\s*;.*$`, 'm');
      const match = scssContent.match(regex);
      if (match && match[1]) {
        const colorValue = match[1].trim();
        palette[colorVarName] = colorValue; // Store the found color
        debugLog(`Found color ${colorVarName}: ${colorValue}`);
      } else {
        if (!palette[colorVarName]) { // Only warn if not already defaulted
          debugLog(`Could not find definition for $${colorVarName} in ${VARIABLES_SCSS_PATH}.`);
        }
      }
    });
    console.log(`🎨 Extracted ${Object.keys(palette).length} colors from SCSS.`);
    return palette;
  } catch (err) {
    console.error(`❌ Error reading or parsing ${VARIABLES_SCSS_PATH}: ${err.message}`);
    console.warn('Using default colors due to error.');
    return palette; // Return defaults on error
  }
}

// --- Main Data Collection Logic ---
async function collectData() {
  console.log('📊 Starting OG image data collection...');
  await ensureDir(TMP_DIR);

  const hugoConfig = await getMergedHugoConfig(); // << USE MERGED CONFIG
  const colorPalette = await getPaletteFromScss(); // << GET FULL PALETTE
  const absoluteLogoPath = join(PROJECT_ROOT, LOGO_PATH_RELATIVE_TO_ROOT);
  const logoDataUri = await getImageDataUri(absoluteLogoPath);

  if (!hugoConfig.siteURL) {
    console.warn('⚠️ Site URL (key `URL`) not found in production or default config. Site name in OG image might be incorrect.');
  }
  if (!logoDataUri) {
    console.warn(`⚠️ Logo not found or unreadable at ${absoluteLogoPath}. Proceeding without logo.`);
  }

  const outputData = {
    siteNameForDisplay: hugoConfig.siteURL || 'visioninit.dev', // << USE SITE URL FROM CONFIG, fallback
    logoDataUri: logoDataUri,
    colors: colorPalette, // << STORE THE FULL PALETTE
    pages: [],
  };

  // 1. Add Homepage Data
  console.log('🏠 Processing Homepage...');
  if (hugoConfig.siteName && hugoConfig.siteDescription) {
    outputData.pages.push({
      type: 'homepage',
      title: hugoConfig.siteName,
      description: hugoConfig.siteDescription,
      outputPath: join(STATIC_DIR, 'og.png'),
      tempHtmlPath: join(PROJECT_ROOT, 'temp-homepage-og.html'),
    });
    debugLog('Added homepage data.');
  } else {
    console.warn('⚠️ Skipping homepage: Site title or description missing in config.');
  }


  // 2. Process Content Pages
  console.log('📄 Processing content pages...');
  const markdownFiles = await findMarkdownFiles(CONTENT_ROOT_DIR);
  let processedCount = 0;
  let skippedCount = 0;

  for (const mdFile of markdownFiles) {
    const pageDirectory = join(mdFile, '..');
    const relativeMdPath = mdFile.replace(PROJECT_ROOT, '');

    try {
      const mdContent = await readFile(mdFile, 'utf8');
      const { title, description, isDraft, excludeSitemap } = extractFrontMatter(mdContent);

      if (isDraft || excludeSitemap || !title || !description) {
        debugLog(`Skipping ${relativeMdPath} (Draft: ${isDraft}, Exclude: ${excludeSitemap}, NoTitle: ${!title}, NoDesc: ${!description})`);
        skippedCount++;
        continue;
      }

      outputData.pages.push({
        type: 'content',
        sourceMdPath: mdFile,
        title: title,
        description: description,
        outputPath: join(pageDirectory, 'og.png'),
        tempHtmlPath: join(pageDirectory, 'temp-og.html'),
      });
      processedCount++;
      debugLog(`Added data for: ${relativeMdPath}`);

    } catch (err) {
      console.error(`❌ Error processing ${relativeMdPath}: ${err.message}`);
    }
  }

  // 3. Write JSON Output
  console.log(`💾 Writing data for ${outputData.pages.length} pages to ${OUTPUT_JSON_PATH}...`);
  try {
    await writeFile(OUTPUT_JSON_PATH, JSON.stringify(outputData, null, 2));
    console.log('✅ Data collection complete.');
    console.log(`📊 Processed ${processedCount} content pages, skipped ${skippedCount}.`);
  } catch (err) {
    console.error(`❌ Failed to write output JSON to ${OUTPUT_JSON_PATH}: ${err.message}`);
    process.exit(1);
  }
}

// --- Execution ---
try {
  require.resolve('toml');
  require.resolve('mime-types');
  debugLog('Required packages (toml, mime-types) found.');
  collectData().catch(err => {
    console.error("🔥 Uncaught error during data collection:", err);
    process.exit(1);
  });
} catch (e) {
  console.error('\n❌ Required package `toml` or `mime-types` is not installed.');
  console.error('   Please install it by running: npm install toml mime-types --save-dev'); // Corrected install command
  process.exit(1);
}
