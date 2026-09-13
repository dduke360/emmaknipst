function badRequest(message) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message })
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function text(value, maxLength = 2000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function formatDateDE(value) {
  if (!value) return '';
  const parts = String(value).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    return value;
  }
}

async function fetchOwnerEmail() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return '';
  try {
    const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/settings?select=value&key=eq.email`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });
    if (!response.ok) return '';
    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? String(rows[0].value).trim() : '';
  } catch (error) {
    console.error('Failed to fetch owner email from Supabase:', error);
    return '';
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed'
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return badRequest('Missing Resend API key.');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return badRequest('Invalid JSON body.');
  }

  const name = text(payload.name, 120);
  const email = text(payload.email, 254);
  const date = text(payload.date, 40);
  const time = text(payload.time, 20);
  const dateAlt = text(payload.dateAlt, 40);
  const timeAlt = text(payload.timeAlt, 20);
  const message = text(payload.message);

  if (!name || !isValidEmail(email) || !date) {
    return badRequest('Bitte Name, E-Mail und Wunschdatum ausfüllen.');
  }

  const ownerEmail = String(process.env.RESEND_TO_EMAIL || '').trim()
    || (await fetchOwnerEmail())
    || 'emma-sophie.weber@web.de';

  if (!isValidEmail(ownerEmail)) {
    return badRequest('Empfänger-E-Mail ist nicht konfiguriert.');
  }

  const from = process.env.RESEND_FROM || 'emmaknipst <onboarding@resend.dev>';

  const lines = [
    `Neue Shooting-Anfrage von ${name}`,
    '',
    `Name: ${name}`,
    `E-Mail: ${email}`,
    '',
    `Wunschtermin: ${formatDateDE(date) || date}${time ? `, ${time} Uhr` : ''}`
  ];
  if (dateAlt) {
    lines.push(`Ausweichtermin: ${formatDateDE(dateAlt) || dateAlt}${timeAlt ? `, ${timeAlt} Uhr` : ''}`);
  }
  if (message) {
    lines.push('', 'Nachricht:', message);
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [ownerEmail],
        reply_to: email,
        subject: `Shooting-Anfrage von ${name}`,
        text: lines.join('\n')
      })
    });
  } catch (error) {
    console.error('Resend request failed:', error);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Mail-Versand fehlgeschlagen.' })
    };
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Resend error:', result);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: result.message || 'Mail-Versand fehlgeschlagen.' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};