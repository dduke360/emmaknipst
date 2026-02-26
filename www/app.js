const DEFAULT_CATEGORIES = [
  { id: 'portraits', name: 'Portraits' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'lifestyle', name: 'Lifestyle' },
  { id: 'nature', name: 'Nature' }
];

let portfolioData = {
  photographer: {},
  categories: [...DEFAULT_CATEGORIES],
  films: [],
  photoFilms: {},
  photoYears: {},
  photos: []
};

const THEME_KEY = 'emma_theme_mode';
const IMAGE_TONE_KEY = 'emma_image_tone';
let currentGalleryPhotos = [];
let galleryResizeTimer = null;
let currentThemeMode = 'color';
let imageToneMode = 'color';
let selectedBackgroundColor = '';
let themeToggleEl = null;
let imageToneToggleEl = null;
let isoFilmToggleEl = null;
let lightboxPhotos = [];
let lightboxIndex = -1;
let lastGalleryWidth = 0;
const imageAspectRatioCache = new Map();
let galleryRenderToken = 0;

function withCloudinaryTransform(url, transform) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

function withWatermark(transform) {
  const currentYear = new Date().getFullYear();
  const watermark = `l_text:Arial_28:%C2%A9%20${currentYear}%20emmaknipst,co_white,o_48,g_south_east,x_18,y_18`;
  return `${transform},${watermark}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex) {
  if (!hex) return null;
  let value = String(hex).trim().toLowerCase();
  if (!value.startsWith('#')) value = `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(value) ? value : null;
}

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  const int = parseInt(n.slice(1), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a, b, t) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  if (!c1 || !c2) return a;
  const ratio = clamp(t, 0, 1);
  return rgbToHex({
    r: c1.r + (c2.r - c1.r) * ratio,
    g: c1.g + (c2.g - c1.g) * ratio,
    b: c1.b + (c2.b - c1.b) * ratio
  });
}

function rgbToHsl({ r, g, b }) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr:
        h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6;
        break;
      case ng:
        h = ((nb - nr) / d + 2) / 6;
        break;
      default:
        h = ((nr - ng) / d + 4) / 6;
    }
  }

  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  };
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (v) => {
    const srgb = v / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function derivePalette(bgHex) {
  const bg = normalizeHex(bgHex);
  if (!bg) return null;

  const lum = relativeLuminance(bg);
  const isDark = lum < 0.34;
  const text = isDark ? '#f5f5f7' : '#111114';
  const white = '#ffffff';
  const black = '#000000';

  const surface = isDark ? mixHex(bg, white, 0.1) : mixHex(bg, white, 0.72);
  const muted = mixHex(text, bg, isDark ? 0.46 : 0.56);
  const border = mixHex(text, bg, isDark ? 0.72 : 0.84);
  const canvas = isDark ? mixHex(bg, black, 0.2) : mixHex(bg, black, 0.1);
  const tile = isDark ? mixHex(bg, white, 0.14) : mixHex(bg, black, 0.08);

  const hsl = rgbToHsl(hexToRgb(bg));
  const accentHsl = {
    h: (hsl.h + (isDark ? 0.06 : 0.08)) % 1,
    s: clamp(hsl.s + 0.22, 0.2, 0.92),
    l: isDark ? clamp(hsl.l + 0.34, 0.58, 0.76) : clamp(hsl.l - 0.22, 0.28, 0.52)
  };
  const accent = rgbToHex(hslToRgb(accentHsl));

  return {
    bg,
    surface,
    text,
    muted,
    border,
    accent,
    shadow: isDark ? '0 20px 44px rgba(0,0,0,0.42)' : '0 18px 40px rgba(25,28,35,0.08)',
    galleryCanvas: canvas,
    galleryTile: tile
  };
}

function applyCustomBackground(color) {
  const palette = derivePalette(color);
  const root = document.documentElement;

  if (!palette) {
    [
      '--bg-custom', '--surface', '--text', '--muted', '--border', '--accent',
      '--shadow', '--gallery-canvas', '--gallery-tile'
    ].forEach(v => root.style.removeProperty(v));
    return;
  }

  root.style.setProperty('--bg-custom', palette.bg);
  root.style.setProperty('--surface', palette.surface);
  root.style.setProperty('--text', palette.text);
  root.style.setProperty('--muted', palette.muted);
  root.style.setProperty('--border', palette.border);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--shadow', palette.shadow);
  root.style.setProperty('--gallery-canvas', palette.galleryCanvas);
  root.style.setProperty('--gallery-tile', palette.galleryTile);
}

function setupTheme() {
  themeToggleEl = document.getElementById('theme-toggle');
  if (!themeToggleEl) return;

  const storedMode = localStorage.getItem(THEME_KEY);
  const initialMode = storedMode === 'light' ? 'light' : 'color';
  applyThemeMode(initialMode);

  themeToggleEl.addEventListener('click', () => {
    const next = currentThemeMode === 'color' ? 'light' : 'color';
    applyThemeMode(next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function applyThemeMode(mode) {
  currentThemeMode = mode;
  document.documentElement.setAttribute('data-theme', 'light');
  applyCustomBackground(mode === 'color' ? selectedBackgroundColor : null);
  if (!themeToggleEl) return;
  themeToggleEl.textContent = mode === 'color' ? 'Light' : 'Color';
  themeToggleEl.setAttribute('aria-label', mode === 'color' ? 'Switch to light mode' : 'Switch to color mode');
}

async function loadData() {
  try {
    const { data: photos, error: photosError } = await supabaseClient
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (photosError) throw photosError;

    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('*');

    if (settingsError) throw settingsError;

    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    let parsedCategories = [...DEFAULT_CATEGORIES];
    if (settingsObj.categories) {
      try {
        const parsed = JSON.parse(settingsObj.categories);
        if (Array.isArray(parsed) && parsed.length) {
          parsedCategories = parsed.filter(c => c && c.id && c.name);
        }
      } catch (e) {
        console.warn('Invalid categories setting JSON, using defaults.');
      }
    }

    let parsedFilms = [];
    if (settingsObj.films) {
      try {
        const parsed = JSON.parse(settingsObj.films);
        if (Array.isArray(parsed)) {
          parsedFilms = parsed.filter(f => f && f.id && f.name);
        }
      } catch (e) {
        console.warn('Invalid films setting JSON, using empty list.');
      }
    }

    let parsedPhotoFilms = {};
    if (settingsObj.photo_films) {
      try {
        const parsed = JSON.parse(settingsObj.photo_films);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedPhotoFilms = parsed;
        }
      } catch (e) {
        console.warn('Invalid photo_films setting JSON, using empty map.');
      }
    }

    let parsedPhotoYears = {};
    if (settingsObj.photo_years) {
      try {
        const parsed = JSON.parse(settingsObj.photo_years);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedPhotoYears = parsed;
        }
      } catch (e) {
        console.warn('Invalid photo_years setting JSON, using empty map.');
      }
    }

    portfolioData.photoFilms = parsedPhotoFilms;
    portfolioData.photoYears = parsedPhotoYears;
    portfolioData.photos = (photos || []).map(photo => ({
      ...photo,
      film: parsedPhotoFilms[String(photo.id)] || '',
      year: parsedPhotoYears[String(photo.id)] || ''
    }));
    portfolioData.categories = parsedCategories;
    portfolioData.films = parsedFilms;
    portfolioData.photographer = {
      about: settingsObj.about || '',
      email: settingsObj.email || '',
      instagram: settingsObj.instagram || '',
      backgroundColor: settingsObj.background_color || ''
    };
    
    localStorage.setItem('emma_photos', JSON.stringify(portfolioData));
    selectedBackgroundColor = portfolioData.photographer.backgroundColor || '';
    applyThemeMode(currentThemeMode);

    init();
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

function init() {
  renderCategoryFilter();
  renderGallery(portfolioData.photos);
  renderAbout();
  renderContact();
  setupLightbox();
  setupNavigation();
  setupResponsiveGallery();
}

function renderCategoryFilter() {
  const filterContainer = document.querySelector('.category-filter');
  filterContainer.innerHTML = '';
  
  // Add "All" button
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.dataset.category = 'all';
  allBtn.textContent = 'All';
  filterContainer.appendChild(allBtn);
  
  portfolioData.categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.category = category.id;
    btn.textContent = category.name;
    filterContainer.appendChild(btn);
  });

  imageToneToggleEl = document.createElement('button');
  imageToneToggleEl.type = 'button';
  imageToneToggleEl.className = 'bw-toggle-btn';
  imageToneToggleEl.id = 'bw-toggle';
  imageToneToggleEl.textContent = 'B/W';
  filterContainer.appendChild(imageToneToggleEl);

  isoFilmToggleEl = document.createElement('button');
  isoFilmToggleEl.type = 'button';
  isoFilmToggleEl.className = 'film-toggle-btn';
  isoFilmToggleEl.id = 'iso400-toggle';
  isoFilmToggleEl.textContent = 'ISO 400 Film';
  filterContainer.appendChild(isoFilmToggleEl);

  const storedTone = localStorage.getItem(IMAGE_TONE_KEY);
  const initialTone = storedTone === 'bw' || storedTone === 'iso400' ? storedTone : 'color';
  applyImageToneMode(initialTone);

  imageToneToggleEl.addEventListener('click', () => {
    const next = imageToneMode === 'bw' ? 'color' : 'bw';
    applyImageToneMode(next);
    localStorage.setItem(IMAGE_TONE_KEY, next);
  });

  isoFilmToggleEl.addEventListener('click', () => {
    const next = imageToneMode === 'iso400' ? 'color' : 'iso400';
    applyImageToneMode(next);
    localStorage.setItem(IMAGE_TONE_KEY, next);
  });

  filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      
      const category = e.target.dataset.category;
      
      // Filter the photos
      const filteredPhotos = category === 'all' 
        ? portfolioData.photos 
        : portfolioData.photos.filter(p => p.category === category);
      
      renderGallery(filteredPhotos);
    }
  });
}

function applyImageToneMode(mode) {
  imageToneMode = mode === 'bw' || mode === 'iso400' ? mode : 'color';
  document.body.classList.toggle('bw-enabled', imageToneMode === 'bw');
  document.body.classList.toggle('iso400-enabled', imageToneMode === 'iso400');

  if (imageToneToggleEl) {
    const isBw = imageToneMode === 'bw';
    imageToneToggleEl.setAttribute('aria-pressed', String(isBw));
    imageToneToggleEl.setAttribute('aria-label', isBw ? 'Disable black and white mode' : 'Enable black and white mode');
  }

  if (isoFilmToggleEl) {
    const isIso = imageToneMode === 'iso400';
    isoFilmToggleEl.setAttribute('aria-pressed', String(isIso));
    isoFilmToggleEl.setAttribute('aria-label', isIso ? 'Disable ISO 400 film look' : 'Enable ISO 400 film look');
  }
}

async function loadImageAspectRatio(src) {
  if (!src) return 1;
  if (imageAspectRatioCache.has(src)) return imageAspectRatioCache.get(src);

  const ratio = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const nextRatio = img.naturalWidth && img.naturalHeight
        ? img.naturalWidth / img.naturalHeight
        : 1;
      resolve(nextRatio || 1);
    };
    img.onerror = () => resolve(1);
    img.src = src;
  });

  imageAspectRatioCache.set(src, ratio);
  return ratio;
}

function calculateRowSpan(baseRow, aspectRatio, isMobile) {
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const adjusted = Math.round(baseRow * (1.08 / ratio));
  return isMobile ? clamp(adjusted, 4, 10) : clamp(adjusted, 4, 11);
}

function getPreferredColSpan(aspectRatio, isMobile) {
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  if (isMobile) {
    if (ratio >= 1.35) return 12;
    return 6;
  }

  if (ratio >= 1.9) return 6;
  if (ratio >= 1.45) return 5;
  if (ratio >= 1.05) return 4;
  if (ratio >= 0.8) return 3;
  return 2;
}

function normalizeRowToTwelve(row) {
  if (!row.length) return row;
  let sum = row.reduce((acc, item) => acc + item.col, 0);
  while (sum < 12) {
    let updated = false;
    for (let i = 0; i < row.length && sum < 12; i += 1) {
      if (row[i].col < 12) {
        row[i].col += 1;
        sum += 1;
        updated = true;
      }
    }
    if (!updated) break;
  }
  return row;
}

function buildAspectLayout(aspectRatios, isMobile) {
  const layout = new Array(aspectRatios.length);
  let row = [];
  let rowIndices = [];
  let rowSum = 0;

  const flushRow = () => {
    if (!row.length) return;
    normalizeRowToTwelve(row);
    const averageRatio = row.reduce((acc, item) => acc + item.ratio, 0) / row.length;
    const baseRow = isMobile ? (averageRatio < 0.95 ? 8 : 6) : (averageRatio < 0.9 ? 7 : averageRatio > 1.5 ? 4 : 5);

    row.forEach((item, i) => {
      layout[rowIndices[i]] = {
        col: item.col,
        row: baseRow
      };
    });
    row = [];
    rowIndices = [];
    rowSum = 0;
  };

  aspectRatios.forEach((ratio, index) => {
    const preferred = getPreferredColSpan(ratio, isMobile);
    let col = preferred;

    if (col > 12) col = 12;
    if (rowSum + col > 12) flushRow();

    row.push({ col, ratio });
    rowIndices.push(index);
    rowSum += col;

    if (rowSum === 12) flushRow();
  });

  flushRow();
  return layout.map(item => item || { col: isMobile ? 12 : 4, row: isMobile ? 6 : 5 });
}

async function renderGallery(photos) {
  const grid = document.getElementById('gallery-grid');
  const renderToken = ++galleryRenderToken;
  currentGalleryPhotos = photos;
  grid.innerHTML = '';
  updateGalleryGridMetrics();
  lastGalleryWidth = grid.clientWidth || lastGalleryWidth;

  const isMobile = window.innerWidth < 700;
  const cachedAspectRatios = photos.map((photo) => imageAspectRatioCache.get(photo.src) || 1);
  const initialLayoutSpans = buildAspectLayout(cachedAspectRatios, isMobile);

  photos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.animationDelay = `${index * 0.028}s`;

    const span = initialLayoutSpans[index];
    item.style.gridColumn = `span ${span.col}`;
    item.style.gridRow = `span ${span.row}`;

    const hasLiked = localStorage.getItem(`liked_${photo.id}`);
    const filmLabel = photo.film
      ? ((portfolioData.films || []).find(f => f.id === photo.film)?.name || photo.film)
      : '';
    const yearLabel = photo.year ? String(photo.year) : '';
    const gallerySrc = withCloudinaryTransform(
      photo.src,
      withWatermark('f_auto,q_auto,dpr_auto,w_400,c_limit')
    );
    item.innerHTML = `
      <img src="${gallerySrc}" alt="${photo.title}" loading="lazy">
      <div class="overlay">
        <div class="overlay-meta">
          <span class="overlay-title">${photo.title}</span>
          ${filmLabel ? `<span class="overlay-film">${filmLabel}</span>` : ''}
          ${yearLabel ? `<span class="overlay-film">${yearLabel}</span>` : ''}
        </div>
      </div>
      <button class="like-btn ${hasLiked ? 'liked' : ''}" data-id="${photo.id}" data-likes="${photo.likes || 0}">
        ♥ ${photo.likes || 0}
      </button>
    `;

    const likeBtn = item.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(photo.id, photo.likes || 0);
    });

    item.addEventListener('click', () => openLightbox(photo));
    grid.appendChild(item);
  });

  const needsAsyncRatios = photos.some((photo) => !imageAspectRatioCache.has(photo.src));
  if (!needsAsyncRatios) return;

  const aspectRatios = await Promise.all(photos.map((photo) => loadImageAspectRatio(photo.src)));
  if (renderToken !== galleryRenderToken) return;

  const refinedLayoutSpans = buildAspectLayout(aspectRatios, isMobile);
  const items = grid.querySelectorAll('.gallery-item');
  items.forEach((item, index) => {
    const span = refinedLayoutSpans[index];
    if (!span) return;
    item.style.gridColumn = `span ${span.col}`;
    item.style.gridRow = `span ${span.row}`;
  });
}

function setupResponsiveGallery() {
  window.addEventListener('resize', () => {
    clearTimeout(galleryResizeTimer);
    galleryResizeTimer = setTimeout(() => {
      const grid = document.getElementById('gallery-grid');
      if (!grid) return;
      const width = grid.clientWidth || 0;

      // On mobile, browser chrome show/hide triggers many resize events with unchanged width.
      // Re-render only when width changes enough to affect tile packing.
      if (Math.abs(width - lastGalleryWidth) < 8) return;

      lastGalleryWidth = width;
      updateGalleryGridMetrics();
      if (currentGalleryPhotos.length > 0) {
        renderGallery(currentGalleryPhotos);
      }
    }, 120);
  });
}

function updateGalleryGridMetrics() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  const width = grid.clientWidth || 0;

  let rowUnit = 38;
  if (width > 1200) rowUnit = 56;
  else if (width > 980) rowUnit = 48;
  else if (width > 760) rowUnit = 42;
  else if (width > 560) rowUnit = 34;

  grid.style.setProperty('--row-unit', `${rowUnit}px`);
}

async function toggleLike(photoId, currentLikes) {
  const likedKey = `liked_${photoId}`;
  
  if (localStorage.getItem(likedKey)) {
    return;
  }
  
  localStorage.setItem(likedKey, 'true');
  
  const newLikes = currentLikes + 1;
  
  try {
    await supabaseClient
      .from('photos')
      .update({ likes: newLikes })
      .eq('id', photoId);
    
    document.querySelectorAll('.like-btn').forEach(btn => {
      if (btn.dataset.id === String(photoId)) {
        btn.classList.add('liked');
        btn.innerHTML = `♥ ${newLikes}`;
      }
    });
  } catch (error) {
    console.error('Failed to like photo:', error);
  }
}

function renderAbout() {
  const aboutText = document.getElementById('about-text');
  const email = document.getElementById('contact-email');
  
  const about = portfolioData.photographer.about || '';
  const paragraphs = about.split('\n\n').filter(p => p.trim());
  const html = paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  aboutText.innerHTML = html;
  email.href = `mailto:${portfolioData.photographer.email || ''}`;
  email.textContent = portfolioData.photographer.email || '';
}

function renderContact() {
}

function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const closeBtn = document.querySelector('.lightbox-close');
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const updateNavButtons = () => {
    const enabled = lightbox.classList.contains('active') && lightboxPhotos.length > 1;
    if (prevBtn) prevBtn.disabled = !enabled;
    if (nextBtn) nextBtn.disabled = !enabled;
  };

  const updateViews = async (photo) => {
    const newViews = (photo.views || 0) + 1;
    photo.views = newViews;
    try {
      await supabaseClient
        .from('photos')
        .update({ views: newViews })
        .eq('id', photo.id);
    } catch (e) {
      console.error('Failed to update views:', e);
    }
  };

  const showPhoto = async (photo) => {
    if (!photo) return;
    lightboxImg.src = withCloudinaryTransform(
      photo.src,
      withWatermark('f_auto,q_auto,dpr_auto,w_1600,c_limit')
    );
    const filmLabel = photo.film
      ? ((portfolioData.films || []).find(f => f.id === photo.film)?.name || photo.film)
      : '';
    const yearLabel = photo.year ? String(photo.year) : '';
    lightboxTitle.innerHTML = `
      <span class="lightbox-title-main">${photo.title || ''}</span>
      ${filmLabel ? `<span class="lightbox-title-sub">${filmLabel}</span>` : ''}
      ${yearLabel ? `<span class="lightbox-title-sub">${yearLabel}</span>` : ''}
    `;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateNavButtons();
    await updateViews(photo);
  };

  const navigatePhoto = async (direction) => {
    if (!lightbox.classList.contains('active') || lightboxPhotos.length < 2) return;
    lightboxIndex = (lightboxIndex + direction + lightboxPhotos.length) % lightboxPhotos.length;
    await showPhoto(lightboxPhotos[lightboxIndex]);
  };

  window.openLightbox = async (photo) => {
    lightboxPhotos = currentGalleryPhotos.length ? currentGalleryPhotos : portfolioData.photos;
    lightboxIndex = lightboxPhotos.findIndex(p => p.id === photo.id);
    if (lightboxIndex === -1) {
      lightboxPhotos = [photo];
      lightboxIndex = 0;
    }
    await showPhoto(photo);
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lightboxPhotos = [];
    lightboxIndex = -1;
    updateNavButtons();
  };

  closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => navigatePhoto(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigatePhoto(1));
  lightboxImg.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  lightbox.addEventListener('touchstart', (e) => {
    if (!lightbox.classList.contains('active')) return;
    const touch = e.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  lightbox.addEventListener('touchend', async (e) => {
    if (!lightbox.classList.contains('active')) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const isHorizontalSwipe = absX > 45 && absX > absY * 1.3 && dt < 700;
    if (!isHorizontalSwipe) return;

    if (dx < 0) await navigatePhoto(1);
    if (dx > 0) await navigatePhoto(-1);
  }, { passive: true });

  document.addEventListener('keydown', async (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') await navigatePhoto(1);
    if (e.key === 'ArrowLeft') await navigatePhoto(-1);
  });

  updateNavButtons();
}

function setupNavigation() {
  document.querySelectorAll('[data-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.link;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

loadData();
setupTheme();
