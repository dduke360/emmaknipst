const crypto = require('crypto');

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function badRequest(message) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message })
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed'
    };
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return badRequest('Missing Cloudinary API secret.');
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return badRequest('Invalid JSON body.');
  }

  const cloudinary = payload.cloudinary || {};
  const transform = String(payload.transform || '').trim();
  const cloudName = String(cloudinary.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const publicId = String(cloudinary.publicId || '').trim();
  const resourceType = String(cloudinary.resourceType || 'image').trim();
  const deliveryType = String(cloudinary.deliveryType || 'private').trim();
  const format = String(cloudinary.format || '').trim();
  const version = cloudinary.version ? `v${cloudinary.version}` : '';

  if (!cloudName || !publicId) {
    return badRequest('Missing Cloudinary delivery metadata.');
  }

  const publicIdPath = publicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const assetName = `${publicIdPath}${format ? `.${encodeURIComponent(format)}` : ''}`;
  const signableParts = [];
  if (transform) signableParts.push(transform);
  if (version) signableParts.push(version);
  signableParts.push(assetName);
  const stringToSign = signableParts.join('/');
  const digest = crypto.createHash('sha1').update(`${stringToSign}${apiSecret}`).digest();
  const signature = toBase64Url(digest).slice(0, 8);

  const urlParts = [
    'https://res.cloudinary.com',
    encodeURIComponent(cloudName),
    resourceType,
    deliveryType,
    `s--${signature}--`
  ];

  if (transform) urlParts.push(transform);
  if (version) urlParts.push(version);
  urlParts.push(assetName);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: urlParts.join('/') })
  };
};
