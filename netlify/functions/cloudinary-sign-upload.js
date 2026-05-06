const crypto = require('crypto');

function badRequest(message) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message })
  };
}

function createSignature(params, apiSecret) {
  const stringToSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${Array.isArray(params[key]) ? params[key].join(',') : params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${stringToSign}${apiSecret}`)
    .digest('hex');
}

function toSnakeCase(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed'
    };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return badRequest('Missing Cloudinary signing env vars.');
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return badRequest('Invalid JSON body.');
  }

  const widgetParams = payload.paramsToSign && typeof payload.paramsToSign === 'object'
    ? payload.paramsToSign
    : {};
  const timestamp = Number(widgetParams.timestamp);
  if (!timestamp) {
    return badRequest('Missing upload timestamp from widget.');
  }

  const uploadPreset = String(payload.uploadPreset || widgetParams.uploadPreset || widgetParams.upload_preset || '').trim();
  const folder = String(payload.folder || widgetParams.folder || '').trim();
  const publicId = String(payload.publicId || widgetParams.publicId || widgetParams.public_id || '').trim()
    || `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  const paramsToSign = Object.entries(widgetParams).reduce((acc, [key, value]) => {
    const normalizedKey = toSnakeCase(key);
    acc[normalizedKey] = value;
    return acc;
  }, {});

  paramsToSign.timestamp = timestamp;
  paramsToSign.source = 'uw';
  if (uploadPreset) paramsToSign.upload_preset = uploadPreset;
  if (folder) paramsToSign.folder = folder;
  paramsToSign.public_id = publicId;

  const signature = createSignature(paramsToSign, apiSecret);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cloudName,
      apiKey,
      folder,
      publicId,
      signature,
      timestamp,
      uploadPreset
    })
  };
};
