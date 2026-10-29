import {
  PROVIDERS,
  ALL_PACKAGE_CODES,
  getTrendingTitles,
  searchTitles,
  getUpcomingTitles
} from './api/justwatch.js';

import {
  initTizenRemoteKeys,
  launchStreamingApp,
  playTrailer,
  exitTizenApp,
  isTizen
} from './tv/tizenBridge.js';

// Application State
const state = {
  currentTab: 'trending', // 'trending' | 'search' | 'upcoming'
  selectedPackages: new Set(ALL_PACKAGE_CODES),
  titles: [],
  activeTitle: null,
  isLoading: false,
  searchQuery: ''
};

// DOM Elements
const gridContainer = document.getElementById('posterGrid');
const loadingBox = document.getElementById('loadingBox');
const emptyBox = document.getElementById('emptyBox');
const searchInput = document.getElementById('searchInput');
const sectionTitle = document.getElementById('sectionTitle');
const sectionCount = document.getElementById('sectionCount');
const filterBar = document.getElementById('filterBar');
const detailModal = document.getElementById('detailModal');

// Initialize App
export function initApp() {
  initTizenRemoteKeys();
  renderFilterPills();
  setupEventListeners();
  loadCurrentTab();
}

// Render Provider Filter Pills in Header
function renderFilterPills() {
  filterBar.innerHTML = '';

  // All 5 Services toggle pill
  const allBtn = document.createElement('button');
  allBtn.className = `filter-pill focusable ${state.selectedPackages.size === PROVIDERS.length ? 'active' : ''}`;
  allBtn.innerHTML = `<span>All 5 Services</span>`;
  allBtn.tabIndex = 0;
  allBtn.onclick = () => {
    if (state.selectedPackages.size === PROVIDERS.length) {
      state.selectedPackages.clear();
      state.selectedPackages.add('nfx'); // keep at least Netflix
    } else {
      state.selectedPackages = new Set(ALL_PACKAGE_CODES);
    }
    renderFilterPills();
    loadCurrentTab();
  };
  filterBar.appendChild(allBtn);

  // Individual service pills
  for (const p of PROVIDERS) {
    const pill = document.createElement('button');
    const isActive = state.selectedPackages.has(p.id);
    pill.className = `filter-pill focusable ${isActive ? 'active' : ''}`;
    pill.style.setProperty('--pill-color', p.color);
    pill.style.setProperty('--pill-bg', p.badgeBg);
    pill.tabIndex = 0;
    pill.innerHTML = `
      <span class="pill-indicator"></span>
      <span>${p.name}</span>
    `;
    pill.onclick = () => {
      if (state.selectedPackages.has(p.id)) {
        if (state.selectedPackages.size > 1) {
          state.selectedPackages.delete(p.id);
        }
      } else {
        state.selectedPackages.add(p.id);
      }
      renderFilterPills();
      loadCurrentTab();
    };
    filterBar.appendChild(pill);
  }
}

// Fetch and display titles based on current tab & filters
export async function loadCurrentTab() {
  setLoading(true);
  try {
    const pkgs = Array.from(state.selectedPackages);

    if (state.currentTab === 'trending') {
      sectionTitle.textContent = 'Trending Across Your Services (Sweden)';
      state.titles = await getTrendingTitles(pkgs, 30);
    } else if (state.currentTab === 'upcoming') {
      sectionTitle.textContent = 'Coming Soon & New in 2026';
      state.titles = await getUpcomingTitles(pkgs, 30);
    } else if (state.currentTab === 'search') {
      sectionTitle.textContent = state.searchQuery ? `Search Results for "${state.searchQuery}"` : 'Search Sweden Catalogs';
      if (state.searchQuery.trim()) {
        state.titles = await searchTitles(state.searchQuery.trim(), 30);
      } else {
        state.titles = [];
      }
    }

    renderGrid(state.titles);
  } catch (err) {
    console.error('[StreamRadar] Failed to load titles:', err);
    gridContainer.innerHTML = '';
    emptyBox.classList.remove('hidden');
    emptyBox.querySelector('p').textContent = `Error loading catalog: ${err.message}`;
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  if (isLoading) {
    loadingBox.classList.remove('hidden');
    emptyBox.classList.add('hidden');
    gridContainer.classList.add('hidden');
  } else {
    loadingBox.classList.add('hidden');
    gridContainer.classList.remove('hidden');
  }
}

function renderGrid(titles) {
  gridContainer.innerHTML = '';
  sectionCount.textContent = `${titles.length} titles`;

  if (titles.length === 0) {
    emptyBox.classList.remove('hidden');
    return;
  }
  emptyBox.classList.add('hidden');

  titles.forEach((title, index) => {
    const card = document.createElement('div');
    card.className = 'card focusable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${title.title} (${title.year})`);

    // Poster fallback
    const posterSrc = title.posterUrl || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%2394a3b8%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%3ENo%20Poster%3C%2Ftext%3E%3C%2Fsvg%3E';

    // Build badges for services carrying this title
    const badgeHtml = title.streamOffers.map(offer => {
      let badgeClass = 'badge-other';
      if (offer.shortName === 'nfx') badgeClass = 'badge-nfx';
      else if (offer.shortName === 'dnp') badgeClass = 'badge-dnp';
      else if (offer.shortName === 'mxx') badgeClass = 'badge-mxx';
      else if (offer.shortName === 'prv') badgeClass = 'badge-prv';
      else if (offer.shortName === 'svt') badgeClass = 'badge-svt';

      return `<span class="stream-badge ${badgeClass}">${offer.clearName}</span>`;
    }).slice(0, 3).join('');

    // If not streaming on subscribed services, show cheapest rent if available
    let rentBadge = '';
    if (title.streamOffers.length === 0 && title.rentOrBuyOffers.length > 0) {
      const cheapest = title.rentOrBuyOffers.filter(o => o.price).sort((a, b) => a.price - b.price)[0];
      if (cheapest) {
        rentBadge = `<span class="stream-badge badge-rent">Rent ${cheapest.price} ${cheapest.currency}</span>`;
      }
    }

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${posterSrc}" alt="${title.title}" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%2394a3b8%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'" />
        <span class="card-type-tag">${title.type === 'SHOW' ? 'Series' : 'Movie'}</span>
        ${title.imdbScore ? `<span class="card-imdb">⭐ ${title.imdbScore}</span>` : ''}
      </div>
      <div class="card-info">
        <div>
          <div class="card-title">${title.title}</div>
          <div class="card-meta">${title.year}${title.genres.length > 0 ? ` • ${title.genres[0]}` : ''}</div>
        </div>
        <div class="card-badges">
          ${badgeHtml}
          ${rentBadge}
        </div>
      </div>
    `;

    card.onclick = () => openDetailModal(title);
    gridContainer.appendChild(card);
  });
}

// Open Detail Modal (Modern Web Guidance compliant <dialog>)
function openDetailModal(title) {
  state.activeTitle = title;

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalPoster = document.getElementById('modalPoster');
  const modalTitle = document.getElementById('modalTitle');
  const modalMeta = document.getElementById('modalMeta');
  const modalGenres = document.getElementById('modalGenres');
  const modalDescription = document.getElementById('modalDescription');
  const launchButtons = document.getElementById('launchButtons');
  const rentBuyContainer = document.getElementById('rentBuyList');

  // Backdrop & Poster
  modalBackdrop.style.backgroundImage = title.backdropUrl ? `url('${title.backdropUrl}')` : 'none';
  modalPoster.src = title.posterUrl;
  modalTitle.textContent = title.title;

  modalMeta.innerHTML = `
    <span>${title.year}</span>
    <span>•</span>
    <span>${title.type === 'SHOW' ? 'TV Series' : 'Movie'}</span>
    ${title.imdbScore ? `<span>•</span><span style="color: var(--gold); font-weight: 700;">⭐ IMDb ${title.imdbScore}</span>` : ''}
  `;

  modalGenres.innerHTML = title.genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
  modalDescription.textContent = title.description;

  // Streaming 1-Click Launch Buttons
  launchButtons.innerHTML = '';
  if (title.streamOffers.length > 0) {
    title.streamOffers.forEach(offer => {
      const btn = document.createElement('button');
      btn.className = 'btn-launch-app focusable';
      btn.style.setProperty('--btn-color', offer.provider.color);
      btn.tabIndex = 0;
      btn.innerHTML = `
        <span>▶ Stream on ${offer.clearName}</span>
      `;
      btn.onclick = () => {
        launchStreamingApp(offer.provider, offer.url);
      };
      launchButtons.appendChild(btn);
    });
  } else {
    launchButtons.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">Not currently included in subscription catalogs.</span>`;
  }

  // Trailer button
  const trailerBtn = document.createElement('button');
  trailerBtn.className = 'btn-trailer focusable';
  trailerBtn.tabIndex = 0;
  trailerBtn.innerHTML = `<span>🎬 Play Trailer</span>`;
  trailerBtn.onclick = () => playTrailer(title.title, title.year);
  launchButtons.appendChild(trailerBtn);

  // Rent / Buy options
  if (title.rentOrBuyOffers.length > 0) {
    const rentMap = new Map();
    for (const r of title.rentOrBuyOffers) {
      if (!rentMap.has(r.clearName) && r.price) {
        rentMap.set(r.clearName, `${r.price} ${r.currency}`);
      }
    }
    const rentItems = Array.from(rentMap.entries())
      .slice(0, 4)
      .map(([svc, price]) => `<span><strong>${svc}:</strong> ${price}</span>`)
      .join(' • ');

    rentBuyContainer.innerHTML = `<span><strong>Rent/Buy:</strong></span> ${rentItems || 'Available on digital stores'}`;
    rentBuyContainer.classList.remove('hidden');
  } else {
    rentBuyContainer.classList.add('hidden');
  }

  detailModal.showModal();

  // Focus the first action button inside the modal
  const firstAction = launchButtons.querySelector('.focusable');
  if (firstAction) {
    setTimeout(() => firstAction.focus(), 50);
  }
}

// Close Modal
function closeDetailModal() {
  if (detailModal.open) {
    detailModal.close();
    state.activeTitle = null;
  }
}

// Keyboard & Remote D-Pad Navigation
function setupEventListeners() {
  // Modal Close Button
  document.getElementById('modalCloseBtn').onclick = closeDetailModal;

  // Nav Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentTab = tab.dataset.tab;

      if (state.currentTab === 'search') {
        searchInput.focus();
      }
      loadCurrentTab();
    };
  });

  // Search Input Debounce
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (state.currentTab !== 'search') {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="search"]').classList.add('active');
        state.currentTab = 'search';
      }
      loadCurrentTab();
    }, 350);
  });

  // Global Keydown Handler for Remote Control & D-Pad
  window.addEventListener('keydown', handleKeyNavigation);
}

function handleKeyNavigation(e) {
  const key = e.key;
  const keyCode = e.keyCode;

  // Samsung Return / Back Button (keyCode 10009) or Escape
  if (key === 'Escape' || keyCode === 10009 || key === 'BrowserBack' || key === 'Back') {
    if (detailModal.open) {
      e.preventDefault();
      closeDetailModal();
      return;
    }
    if (state.currentTab === 'search' && state.searchQuery) {
      e.preventDefault();
      searchInput.value = '';
      state.searchQuery = '';
      loadCurrentTab();
      return;
    }
  }

  // Samsung Color Remote Keys
  // Red = Netflix, Green = Disney+, Yellow = Max, Blue = Prime Video
  if (key === 'ColorF0Red' || keyCode === 403) {
    toggleServiceFilter('nfx');
    return;
  }
  if (key === 'ColorF1Green' || keyCode === 404) {
    toggleServiceFilter('dnp');
    return;
  }
  if (key === 'ColorF2Yellow' || keyCode === 405) {
    toggleServiceFilter('mxx');
    return;
  }
  if (key === 'ColorF3Blue' || keyCode === 406) {
    toggleServiceFilter('prv');
    return;
  }

  // D-Pad Spatial Navigation
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    handleSpatialArrow(e, key);
  }
}

function toggleServiceFilter(pkgId) {
  if (state.selectedPackages.has(pkgId)) {
    if (state.selectedPackages.size > 1) {
      state.selectedPackages.delete(pkgId);
    }
  } else {
    state.selectedPackages.add(pkgId);
  }
  renderFilterPills();
  loadCurrentTab();
}

// Spatial 2D Navigation Engine
function handleSpatialArrow(e, direction) {
  const current = document.activeElement;
  const scope = detailModal.open ? detailModal : document;
  const focusables = Array.from(scope.querySelectorAll('.focusable, input, button:not([disabled])'))
    .filter(el => el.offsetParent !== null);

  if (focusables.length === 0) return;

  const currentIndex = focusables.indexOf(current);
  if (currentIndex === -1) {
    focusables[0].focus();
    e.preventDefault();
    return;
  }

  const currentRect = current.getBoundingClientRect();
  let bestCandidate = null;
  let minDistance = Infinity;

  for (const el of focusables) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();

    let isCandidate = false;
    let dist = Infinity;

    if (direction === 'ArrowRight' && r.left >= currentRect.left + 5) {
      const dx = r.left - currentRect.right;
      const dy = Math.abs((r.top + r.height / 2) - (currentRect.top + currentRect.height / 2));
      dist = (dx > 0 ? dx : 0) + dy * 2;
      isCandidate = true;
    } else if (direction === 'ArrowLeft' && r.right <= currentRect.right - 5) {
      const dx = currentRect.left - r.right;
      const dy = Math.abs((r.top + r.height / 2) - (currentRect.top + currentRect.height / 2));
      dist = (dx > 0 ? dx : 0) + dy * 2;
      isCandidate = true;
    } else if (direction === 'ArrowDown' && r.top >= currentRect.top + 5) {
      const dy = r.top - currentRect.bottom;
      const dx = Math.abs((r.left + r.width / 2) - (currentRect.left + currentRect.width / 2));
      dist = (dy > 0 ? dy : 0) + dx * 1.5;
      isCandidate = true;
    } else if (direction === 'ArrowUp' && r.bottom <= currentRect.bottom - 5) {
      const dy = currentRect.top - r.bottom;
      const dx = Math.abs((r.left + r.width / 2) - (currentRect.left + currentRect.width / 2));
      dist = (dy > 0 ? dy : 0) + dx * 1.5;
      isCandidate = true;
    }

    if (isCandidate && dist < minDistance) {
      minDistance = dist;
      bestCandidate = el;
    }
  }

  if (bestCandidate) {
    e.preventDefault();
    bestCandidate.focus();
    bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
