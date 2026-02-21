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
  grid.innerHTML = '';

  photos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.animationDelay = `${index * 0.05}s`;
    
    const hasLiked = localStorage.getItem(`liked_${photo.id}`);
    
    item.innerHTML = `
      <img src="${photo.src}" alt="${photo.title}" loading="lazy">
      <div class="overlay">
        <span>${photo.title}</span>
        <button class="like-btn ${hasLiked ? 'liked' : ''}" data-id="${photo.id}" data-likes="${photo.likes || 0}">
          ♥ ${photo.likes || 0}
        </button>
      </div>
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
  aboutText.innerHTML = `<p>${portfolioData.photographer.about || ''}</p>`;
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

  window.openLightbox = (photo) => {
    lightboxImg.src = photo.src.replace('w=800', 'w=1600');
    lightboxTitle.textContent = photo.title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
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
