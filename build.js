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

const files = ['supabase.js', 'admin.html'];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
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
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  } else {
    console.log(`Skipped: ${file} (no placeholders found)`);
  }
});

console.log('Build complete');
