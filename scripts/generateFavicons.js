const { join } = require('path'); // <<< ADD THIS LINE AT THE TOP
const { execSync } = require('child_process');
const { mkdir, stat } = require('fs/promises');

// --- Configuration ---
const SOURCE_LOGO = join(process.cwd(), 'assets', 'images', 'logo-source.png'); // Source logo (MUST be in assets)
const STATIC_OUTPUT_DIR = join(process.cwd(), 'static'); // Base static directory

// Desired output files, sizes, and subdirectories within static/
const IMAGE_CONFIG = [
  // Favicons (output to static root)
  {
    filename: 'favicon-16x16.png',
    size: 16,
    outputSubDir: '',
    forceSquare: true,
  },
  {
    filename: 'favicon-32x32.png',
    size: 32,
    outputSubDir: '',
    forceSquare: true,
  },
  {
    filename: 'apple-touch-icon.png',
    size: 180,
    outputSubDir: '',
    forceSquare: true,
  },
  { filename: 'favicon.png', size: 96, outputSubDir: '', forceSquare: true },
  { filename: 'favicon.ico', size: 32, outputSubDir: '', forceSquare: true },
  // Main Logo (output to static/images/, resize based on height)
  { filename: 'logo.png', height: 80, outputSubDir: '', forceSquare: false },
];

// --- Helper Functions ---
async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err; // Re-throw other errors
  }
}

async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      // Ignore error if directory already exists
      throw err;
    }
  }
}

// --- Main Generation Logic ---
async function generateImagesWithImageMagick() {
  console.log('🚀 Starting image generation using ImageMagick...');

  // 1. Check if ImageMagick (convert command) is available
  try {
    execSync('convert -version', { stdio: 'ignore' }); // Check if command exists
    console.log('✅ ImageMagick (convert) found.');
  } catch (err) {
    console.error('❌ Error: ImageMagick `convert` command not found.');
    console.error(
      '   Please install ImageMagick (e.g., `sudo apt-get install imagemagick` on Ubuntu/Debian)'
    );
    console.error('   Or ensure it is available in your PATH.');
    process.exit(1);
  }

  // 2. Check if source logo exists
  if (!(await fileExists(SOURCE_LOGO))) {
    console.error(`❌ Error: Source logo not found at ${SOURCE_LOGO}`);
    console.error(
      '   Ensure your logo is placed correctly in the assets/images directory.'
    );
    process.exit(1);
  }
  console.log(`🔍 Found source logo: ${SOURCE_LOGO}`);

  // 3. Ensure base static output directory exists
  await ensureDir(STATIC_OUTPUT_DIR);
  console.log(`✅ Base output directory ensured: ${STATIC_OUTPUT_DIR}`);

  // 4. Generate each image
  let successCount = 0;
  let errorCount = 0;

  for (const config of IMAGE_CONFIG) {
    const outputDir = join(STATIC_OUTPUT_DIR, config.outputSubDir || '');
    await ensureDir(outputDir); // Ensure subdirectory exists (e.g., static/images/)
    const outputPath = join(outputDir, config.filename);

    let resizeOption = '';
    let extentOption = '';
    let sizeLabel = '';

    if (config.size) {
      // Used for favicons primarily
      sizeLabel = `${config.size}x${config.size}`;
      resizeOption = `-resize ${sizeLabel}`;
      if (config.forceSquare) {
        extentOption = `-background none -gravity center -extent ${sizeLabel}`;
      }
    } else if (config.height) {
      // Used for the main logo - resize by height, width adjusts
      sizeLabel = `height ${config.height}px`;
      resizeOption = `-resize x${config.height}`; // Resize based on height
      // No extent needed, let width be proportional
    } else {
      console.warn(
        `   ⚠️ Skipping ${config.filename}: No size or height specified.`
      );
      continue;
    }

    console.log(`   Generating ${config.filename} (${sizeLabel})...`);

    // Construct the ImageMagick command
    const command = `convert "${SOURCE_LOGO}" ${resizeOption} ${extentOption} "${outputPath}"`;

    try {
      console.log(`   Executing: ${command}`);
      execSync(command, { stdio: 'inherit' });
      console.log(`   ✅ Saved ${outputPath}`);
      successCount++;
    } catch (err) {
      console.error(
        `   ❌ Error generating ${config.filename}: ${err.message || 'ImageMagick command failed'}`
      );
      errorCount++;
    }
  }

  // 5. Summary
  console.log('\n✨ Image generation complete!');
  console.log(`📊 Summary: ${successCount} generated, ${errorCount} errors.`);
  if (errorCount > 0) {
    process.exitCode = 1; // Indicate failure
  }
}

// --- Execution ---
generateImagesWithImageMagick().catch((err) => {
  console.error(
    '\n🔥 Critical error during image generation script execution:',
    err
  );
  process.exit(1);
});
