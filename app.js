let portfolioData = {
  photographer: {},
  categories: [
    { id: 'portraits', name: 'Portraits' },
    { id: 'fashion', name: 'Fashion' },
    { id: 'lifestyle', name: 'Lifestyle' },
    { id: 'nature', name: 'Nature' }
  ],
  photos: []
};

const THEME_KEY = 'emma_theme';
let currentGalleryPhotos = [];
let galleryResizeTimer = null;

function setupTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const storedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme, toggle);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, toggle);
    localStorage.setItem(THEME_KEY, next);
  });
}

function applyTheme(theme, toggle) {
  document.documentElement.setAttribute('data-theme', theme);
  toggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
  toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
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

    portfolioData.photos = photos || [];
    portfolioData.photographer = {
      about: settingsObj.about || '',
      email: settingsObj.email || '',
      instagram: settingsObj.instagram || ''
    };
    
    localStorage.setItem('emma_photos', JSON.stringify(portfolioData));

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

  filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      const category = e.target.dataset.category;
      
      // Filter the photos
      const filteredPhotos = category === 'all' 
        ? portfolioData.photos 
        : portfolioData.photos.filter(p => p.category === category);
      
      renderGallery(filteredPhotos);
    }
  });
}

function renderGallery(photos) {
  const grid = document.getElementById('gallery-grid');
  currentGalleryPhotos = photos;
  grid.innerHTML = '';
  updateGalleryGridMetrics();

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
    .map((p, i) => `<p class="${i === 0 ? 'about-intro' : 'about-body'}">${p.replace(/\n/g, '<br>')}</p>`)
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

  window.openLightbox = async (photo) => {
    lightboxImg.src = photo.src.replace('w=800', 'w=1600');
    lightboxTitle.textContent = photo.title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Increment view count
    const newViews = (photo.views || 0) + 1;
    try {
      await supabaseClient
        .from('photos')
        .update({ views: newViews })
        .eq('id', photo.id);
    } catch (e) {
      console.error('Failed to update views:', e);
    }
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
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
