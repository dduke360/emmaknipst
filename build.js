const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load .env file if exists
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  });
}

function getAppVersion() {
  try {
    const gitTag = execSync('git describe --tags --abbrev=0', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (gitTag) return formatAppVersion(gitTag);
  } catch (error) {
    // Fall back to package.json version when no tag is available.
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (packageJson.version) return formatAppVersion(packageJson.version);
  } catch (error) {
    // Fall through to final default below.
  }

  return 'vdev';
}

function formatAppVersion(version) {
  const value = String(version || '').trim();
  if (!value) return 'vdev';
  return value.startsWith('v') ? value : `v${value}`;
}

const envVars = {
  '%SUPABASE_URL%': process.env.SUPABASE_URL,
  '%SUPABASE_ANON_KEY%': process.env.SUPABASE_ANON_KEY,
  '%ADMIN_PASSWORD%': process.env.ADMIN_PASSWORD,
  '%CLOUDINARY_CLOUD_NAME%': process.env.CLOUDINARY_CLOUD_NAME,
  '%CLOUDINARY_UPLOAD_PRESET%': process.env.CLOUDINARY_UPLOAD_PRESET,
  '%APP_VERSION%': getAppVersion()
};

const targetDir = process.env.BUILD_TARGET_DIR
  ? path.resolve(process.env.BUILD_TARGET_DIR)
  : path.join(__dirname, 'www');

const files = ['index.html', 'supabase.js', 'admin.html'];

files.forEach(file => {
  const fullPath = path.join(targetDir, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipped: ${fullPath} (file not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  Object.keys(envVars).forEach(placeholder => {
    const value = envVars[placeholder];
    if (value) {
      const regex = new RegExp(placeholder, 'g');
      if (content.includes(placeholder)) {
        content = content.replace(regex, value);
        changed = true;
      }
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated: ${fullPath}`);
  } else {
    console.log(`Skipped: ${fullPath} (no placeholders found)`);
  }
});

console.log('Build complete');
