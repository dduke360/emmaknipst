const fs = require('fs');
const path = require('path');

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

const envVars = {
  '%SUPABASE_URL%': process.env.SUPABASE_URL,
  '%SUPABASE_ANON_KEY%': process.env.SUPABASE_ANON_KEY,
  '%ADMIN_PASSWORD%': process.env.ADMIN_PASSWORD,
  '%CLOUDINARY_CLOUD_NAME%': process.env.CLOUDINARY_CLOUD_NAME,
  '%CLOUDINARY_UPLOAD_PRESET%': process.env.CLOUDINARY_UPLOAD_PRESET
};

const targetDir = process.env.BUILD_TARGET_DIR
  ? path.resolve(process.env.BUILD_TARGET_DIR)
  : path.join(__dirname, 'www');

const files = ['supabase.js', 'admin.html'];

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
