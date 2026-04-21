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

## 4. Set Environment Variables
Set these values in your `.env` (local) or Netlify environment variables:

```javascript
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 5. Deploy
Commit and push your changes. The Cloudinary upload feature will now work!

## Signed Uploads For Protected Assets

To protect newly uploaded originals:

1. Open your Cloudinary Upload Preset.
2. Set the preset to `Signed`.
3. Set the delivery type to `private` if you want original assets to require signed delivery URLs.
4. Add `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to Netlify environment variables.

This project uses a Netlify Function at `/.netlify/functions/cloudinary-sign-upload` to generate upload signatures server-side.

## How It Works
- Images uploaded via Cloudinary are stored in your Cloudinary account
- They persist forever and are NOT affected by Netlify deployments
- Images are served via Cloudinary's CDN (fast loading worldwide)
- Free tier: 25GB bandwidth/month, 25GB storage
