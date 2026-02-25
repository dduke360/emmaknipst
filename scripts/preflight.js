const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function parseEnvFile(filePath) {
  const content = readFileSafe(filePath);
  const values = {};
  if (!content) return values;

  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  });
  return values;
}

function getEnvValue(key, envFileValues) {
  return process.env[key] || envFileValues[key] || '';
}

function hasUsageString(plistContent, key) {
  return plistContent.includes(`<key>${key}</key>`);
}

function fail(msg, failures) {
  failures.push(msg);
}

function ok(msg, successes) {
  successes.push(msg);
}

function isPlaceholder(value) {
  return value.includes('%') || value.includes('YOUR_') || value === '';
}

function main() {
  const failures = [];
  const successes = [];

  const envValues = parseEnvFile(path.join(ROOT, '.env'));

  const requiredEnv = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_UPLOAD_PRESET'
  ];

  requiredEnv.forEach((key) => {
    const value = getEnvValue(key, envValues);
    if (!value || isPlaceholder(value)) {
      fail(`Missing or invalid env var: ${key}`, failures);
    } else {
      ok(`Env var present: ${key}`, successes);
    }
  });

  const requiredFiles = [
    'capacitor.config.json',
    'ios/App/App.xcodeproj/project.pbxproj',
    'ios/App/App/Info.plist',
    'admin.html',
    'supabase.js'
  ];

  requiredFiles.forEach((file) => {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      fail(`Required file missing: ${file}`, failures);
    } else {
      ok(`File exists: ${file}`, successes);
    }
  });

  const adminHtml = readFileSafe(path.join(ROOT, 'admin.html')) || '';
  const supabaseJs = readFileSafe(path.join(ROOT, 'supabase.js')) || '';
  if (!adminHtml.includes('%CLOUDINARY_CLOUD_NAME%') || !adminHtml.includes('%CLOUDINARY_UPLOAD_PRESET%')) {
    fail('admin.html should contain Cloudinary placeholders', failures);
  } else {
    ok('admin.html uses Cloudinary placeholders', successes);
  }
  if (!supabaseJs.includes('%SUPABASE_URL%') || !supabaseJs.includes('%SUPABASE_ANON_KEY%')) {
    fail('supabase.js should contain Supabase placeholders', failures);
  } else {
    ok('supabase.js uses Supabase placeholders', successes);
  }

  const plist = readFileSafe(path.join(ROOT, 'ios/App/App/Info.plist')) || '';
  if (!hasUsageString(plist, 'NSCameraUsageDescription')) {
    fail('Info.plist missing NSCameraUsageDescription', failures);
  } else {
    ok('Info.plist has NSCameraUsageDescription', successes);
  }
  if (!hasUsageString(plist, 'NSPhotoLibraryUsageDescription')) {
    fail('Info.plist missing NSPhotoLibraryUsageDescription', failures);
  } else {
    ok('Info.plist has NSPhotoLibraryUsageDescription', successes);
  }

  const summary = [
    '',
    'Preflight summary:',
    ...successes.map((s) => `  + ${s}`),
    ...failures.map((f) => `  - ${f}`)
  ].join('\n');
  console.log(summary);

  if (failures.length > 0) {
    process.exit(1);
  }

  console.log('\nPreflight passed.');
}

main();
