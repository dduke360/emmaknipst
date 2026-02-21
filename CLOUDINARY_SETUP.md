# Cloudinary Setup Guide

## 1. Create a Cloudinary Account
1. Go to https://cloudinary.com/
2. Sign up for a free account

## 2. Get Your Cloud Name
1. After login, go to your Dashboard
2. Your cloud name is shown at the top (e.g., `your-name`)

## 3. Create an Upload Preset
1. Go to Settings (gear icon) > Upload
2. Scroll to "Upload presets" 
3. Click "Add upload preset"
4. Configure:
   - **Signing mode**: Unsigned
   - **Folder**: emma_knipst (or any folder name)
   - **Access mode**: Public
5. Save the preset
6. Copy the preset name (e.g., `ml_default`)

## 4. Update admin.html
Open `admin.html` and replace these values:

```javascript
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';
```

Example:
```javascript
const CLOUDINARY_CLOUD_NAME = 'myportfolio';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';
```

## 5. Deploy
Commit and push your changes. The Cloudinary upload feature will now work!

## How It Works
- Images uploaded via Cloudinary are stored in your Cloudinary account
- They persist forever and are NOT affected by Netlify deployments
- Images are served via Cloudinary's CDN (fast loading worldwide)
- Free tier: 25GB bandwidth/month, 25GB storage
