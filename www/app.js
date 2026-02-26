const DEFAULT_CATEGORIES = [
  { id: 'portraits', name: 'Portraits' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'lifestyle', name: 'Lifestyle' },
  { id: 'nature', name: 'Nature' }
];

let portfolioData = {
  photographer: {},
  categories: [...DEFAULT_CATEGORIES],
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

    portfolioData.photos = photos || [];
    portfolioData.categories = parsedCategories;
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

function renderGallery(photos) {
  const grid = document.getElementById('gallery-grid');
  currentGalleryPhotos = photos;
  grid.innerHTML = '';
  updateGalleryGridMetrics();
  lastGalleryWidth = grid.clientWidth || lastGalleryWidth;

  photos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.animationDelay = `${index * 0.028}s`;

    const span = getMosaicSpan(index, photos.length);
    item.style.gridColumn = `span ${span.col}`;
    item.style.gridRow = `span ${span.row}`;

    const hasLiked = localStorage.getItem(`liked_${photo.id}`);
    item.innerHTML = `
      <img src="${photo.src}" alt="${photo.title}" loading="lazy">
      <div class="overlay">
        <span>${photo.title}</span>
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

function getMosaicSpan(index, total) {
  const isMobile = window.innerWidth < 700;
  if (isMobile) {
    const mobilePattern = [
      { col: 12, row: 7 },
      { col: 6, row: 5 },
      { col: 6, row: 5 },
      { col: 12, row: 6 }
    ];
    return mobilePattern[index % mobilePattern.length];
  }

  if (total === 1) return { col: 12, row: 9 };
  if (total === 2) return { col: 6, row: 6 };

  // Hero block like the reference: stacked left + dominant tile right.
  if (index === 0) return { col: 4, row: 4 };
  if (index === 1) return { col: 8, row: 9 };
  if (index === 2) return { col: 4, row: 5 };

  // Fill the remaining grid without trailing holes:
  // final row becomes 12 | 6+6 | 4+4+4 depending on remainder.
  const remaining = total - 3;
  const pos = index - 3;
  const remainder = remaining % 3;
  const isLast = pos === remaining - 1;
  const isLastTwo = pos >= remaining - 2;

  if (remainder === 1 && isLast) return { col: 12, row: 5 };
  if (remainder === 2 && isLastTwo) return { col: 6, row: 5 };
  return { col: 4, row: 5 };
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
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

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
    lightboxImg.src = photo.src.replace('w=800', 'w=1600');
    lightboxTitle.textContent = photo.title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
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
  };

  closeBtn.addEventListener('click', closeLightbox);
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
