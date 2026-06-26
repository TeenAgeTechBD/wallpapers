let wallpapers = [];
let currentPage = 1;
let wallpapersPerPage = calculateWallpapersPerPage();
let slideshowInterval = null;
let currentSearchResults = null;
let lastFullscreenTrigger = null;
let focusTrapKeyHandler = null;

let cache = {
    data: null,
    timestamp: null,
    cacheDuration: 60 * 60 * 1000,
};

document.getElementById('currentYear').textContent = new Date().getFullYear();

function showToast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-visible'));
    setTimeout(() => {
        el.classList.remove('toast-visible');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function focusTrap(container) {
    const focusables = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = container.querySelectorAll(focusables);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    focusTrapKeyHandler = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last && last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first && first.focus();
            }
        }
    };
    document.addEventListener('keydown', focusTrapKeyHandler);
    first && first.focus();
}

function releaseFocusTrap() {
    if (focusTrapKeyHandler) {
        document.removeEventListener('keydown', focusTrapKeyHandler);
        focusTrapKeyHandler = null;
    }
}

function calculateWallpapersPerPage() {
    const screenWidth = window.innerWidth;
    const baseWidth = 1920;
    const baseCount = 12;
    const minCount = 5;

    const ratio = screenWidth / baseWidth;

    if (ratio < 1) {
        return Math.max(minCount, Math.floor(baseCount * ratio));
    } else {
        const imageWidth = 300;
        const gap = 30;
        const availableWidth = screenWidth - (2 * gap);
        const imagesPerRow = Math.floor(availableWidth / (imageWidth + gap));
        const rows = Math.floor(window.innerHeight / (imageWidth + gap));
        const totalImages = imagesPerRow * rows;

        if (Math.abs(screenWidth - baseWidth) < 10) {
            return baseCount;
        }
        return Math.max(minCount, totalImages);
    }
}

window.addEventListener('resize', () => {
    wallpapersPerPage = calculateWallpapersPerPage();
    displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
    updatePagination(currentSearchResults || wallpapers);
});

function showLoading() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    gallery.classList.add('gallery-loading');
    const count = Math.min(12, Math.max(6, Math.floor((window.innerWidth / 320) * (window.innerHeight / 240))));
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        gallery.appendChild(card);
    }
}

function showError(message, onRetry) {
    const gallery = document.getElementById('gallery');
    gallery.classList.remove('gallery-loading');
    gallery.innerHTML = `
        <div class="state-message state-error" role="alert" aria-live="polite">
            <span class="state-icon" aria-hidden="true">⚠</span>
            <p class="state-title">${message}</p>
            <button type="button" class="btn btn-primary" id="retryBtn">Retry</button>
        </div>`;
    document.getElementById('retryBtn').addEventListener('click', onRetry);
}

function showEmpty(message, onClear) {
    const gallery = document.getElementById('gallery');
    gallery.classList.remove('gallery-loading');
    gallery.innerHTML = `
        <div class="state-message state-empty" role="status" aria-live="polite">
            <span class="state-icon" aria-hidden="true">🖼</span>
            <p class="state-title">${message}</p>
            <button type="button" class="btn btn-primary" id="clearSearchBtn">View all</button>
        </div>`;
    document.getElementById('clearSearchBtn').addEventListener('click', onClear);
}

async function loadWallpapers() {
    const repoUrl = 'https://api.github.com/repos/TeenAgeTechBD/wallpapers/contents/wallpapers';
    const gallery = document.getElementById('gallery');

    if (cache.data && Date.now() - cache.timestamp < cache.cacheDuration) {
        wallpapers = cache.data;
        gallery.classList.remove('gallery-loading');
        displayWallpapers(getPaginatedWallpapers(currentPage));
        updatePagination();
        return;
    }

    showLoading();
    try {
        const response = await fetch(repoUrl);
        if (!response.ok) throw new Error('Failed to fetch wallpapers');
        const files = await response.json();

        wallpapers = files.filter(file =>
            file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png') || file.name.endsWith('.gif')
        );

        cache.data = [...wallpapers];
        cache.timestamp = Date.now();
        shuffleArray(wallpapers);

        gallery.classList.remove('gallery-loading');
        displayWallpapers(getPaginatedWallpapers(currentPage));
        updatePagination();
    } catch (error) {
        console.error('Error:', error);
        showError("Couldn't load wallpapers. Check your connection and try again.", loadWallpapers);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function displayWallpapers(files) {
    const gallery = document.getElementById('gallery');
    gallery.classList.remove('gallery-loading');
    gallery.innerHTML = '';

    const data = currentSearchResults || wallpapers;
    if (files.length === 0) {
        if (data.length === 0) {
            showError('No wallpapers to display.', loadWallpapers);
            return;
        }
        showEmpty('No wallpapers found.', () => {
            document.getElementById('searchInput').value = '';
            currentSearchResults = null;
            currentPage = 1;
            displayWallpapers(getPaginatedWallpapers(currentPage));
            updatePagination();
        });
        return;
    }

    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'wallpaper-card';

        const imgElement = document.createElement('img');
        imgElement.src = file.download_url;
        imgElement.alt = file.name;
        imgElement.loading = 'lazy';
        imgElement.className = 'wallpaper-img';

        const overlay = document.createElement('div');
        overlay.className = 'wallpaper-overlay';

        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'btn-icon overlay-btn';
        fullscreenBtn.setAttribute('aria-label', 'View fullscreen');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.onclick = (e) => {
            e.stopPropagation();
            lastFullscreenTrigger = fullscreenBtn;
            openFullscreen(file.download_url, file.name);
        };

        imgElement.onclick = () => {
            lastFullscreenTrigger = fullscreenBtn;
            openFullscreen(file.download_url, file.name);
        };

        overlay.appendChild(fullscreenBtn);
        card.appendChild(imgElement);
        card.appendChild(overlay);
        gallery.appendChild(card);
    });
}

function openFullscreen(url, name) {
    const fullscreenContainer = document.getElementById('fullscreen-container');
    const imgElement = document.getElementById('fullscreen-image');
    const downloadButton = document.getElementById('downloadBtn');

    imgElement.src = url;
    imgElement.alt = name || url.split('/').pop();

    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            downloadButton.href = blobUrl;
            downloadButton.download = (name || url.split('/').pop()).split('/').pop();
        })
        .catch(() => {});

    fullscreenContainer.style.display = 'block';
    fullscreenContainer.setAttribute('aria-hidden', 'false');
    document.body.style.cursor = 'none';
    focusTrap(fullscreenContainer);

    const CURSOR_IDLE_MS = 2000;
    const showCursor = () => {
        document.body.style.cursor = 'auto';
        if (fullscreenContainer._cursorHideTimeoutId) clearTimeout(fullscreenContainer._cursorHideTimeoutId);
        fullscreenContainer._cursorHideTimeoutId = setTimeout(() => {
            document.body.style.cursor = 'none';
            fullscreenContainer._cursorHideTimeoutId = null;
        }, CURSOR_IDLE_MS);
    };
    fullscreenContainer.addEventListener('mousemove', showCursor);
    fullscreenContainer.addEventListener('pointermove', showCursor);
    fullscreenContainer._cursorShow = showCursor;

    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', keyHandler);
            releaseFocusTrap();
            closeFullscreen();
        }
    };
    document.addEventListener('keydown', keyHandler);
    fullscreenContainer._escapeHandler = keyHandler;

    fullscreenContainer.requestFullscreen().catch(() => {});
}

function closeFullscreen() {
    const fullscreenContainer = document.getElementById('fullscreen-container');
    if (fullscreenContainer._escapeHandler) {
        document.removeEventListener('keydown', fullscreenContainer._escapeHandler);
        fullscreenContainer._escapeHandler = null;
    }
    if (fullscreenContainer._cursorShow) {
        if (fullscreenContainer._cursorHideTimeoutId) clearTimeout(fullscreenContainer._cursorHideTimeoutId);
        fullscreenContainer.removeEventListener('mousemove', fullscreenContainer._cursorShow);
        fullscreenContainer.removeEventListener('pointermove', fullscreenContainer._cursorShow);
    }
    releaseFocusTrap();
    document.body.style.cursor = 'auto';
    fullscreenContainer.style.display = 'none';
    fullscreenContainer.setAttribute('aria-hidden', 'true');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    lastFullscreenTrigger = null;

    displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
    updatePagination(currentSearchResults || wallpapers);

    var focusTarget = document.getElementById('searchInput') || document.querySelector('.main') || document.body;
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
}

function searchWallpapers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    currentSearchResults = wallpapers.filter(file => file.name.toLowerCase().includes(searchTerm));
    currentPage = 1;
    displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults));
    updatePagination(currentSearchResults);
}

function showLatestWallpapers() {
    if (cache.data) {
        currentSearchResults = [...cache.data].reverse();
        document.getElementById('searchInput').value = '';
        document.getElementById('clearButton').classList.remove('visible');
        currentPage = 1;
        displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults));
        updatePagination(currentSearchResults);
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentSearchResults = null;
    currentPage = 1;
    displayWallpapers(getPaginatedWallpapers(currentPage));
    updatePagination();
}

function getPaginatedWallpapers(page, data = wallpapers) {
    const startIndex = (page - 1) * wallpapersPerPage;
    const endIndex = startIndex + wallpapersPerPage;
    return data.slice(startIndex, endIndex);
}

function updatePagination(data = wallpapers) {
    const totalPages = Math.ceil(data.length / wallpapersPerPage) || 1;
    const paginationContainer = document.getElementById('pagination');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const pageInfo = document.getElementById('pageInfo');

    if (data.length <= wallpapersPerPage) {
        paginationContainer.classList.add('pagination-hidden');
        return;
    } else {
        paginationContainer.classList.remove('pagination-hidden');
    }

    if (currentPage > totalPages) currentPage = totalPages;

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

// Slideshow Management Engine
function startSlideshow() {
    const data = currentSearchResults || wallpapers;
    if (!data.length) return;
    
    let currentIndex = 0;
    const container = document.getElementById('slideshow-container');
    const img = document.getElementById('slideshow-image');
    const counter = document.getElementById('slideshow-counter');
    const popup = document.getElementById('slideshow-popup');
    const dlBtn = document.getElementById('slideshowDownloadBtn');
    const pauseBtn = document.getElementById('slideshowPauseButton');

    const updateSlideshowView = () => {
        const item = data[currentIndex];
        img.classList.remove('fade-in');
        
        setTimeout(() => {
            img.src = item.download_url;
            img.alt = item.name;
            img.classList.add('fade-in');
            counter.textContent = `${currentIndex + 1} / ${data.length}`;
            
            img.onclick = () => window.open(item.download_url, '_blank');
            dlBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = item.download_url;
                a.download = item.name;
                a.click();
            };
        }, 200);
    };

    container.style.display = 'flex';
    container.setAttribute('aria-hidden', 'false');
    updateSlideshowView();
    focusTrap(container);
    
    setTimeout(() => popup.classList.add('slideshow-popup-hide'), 3000);

    const runInterval = () => {
        slideshowInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % data.length;
            updateSlideshowView();
        }, 4000);
    };
    runInterval();

    pauseBtn.onclick = () => {
        const isPaused = pauseBtn.getAttribute('data-state') === 'play';
        if (isPaused) {
            pauseBtn.setAttribute('data-state', 'pause');
            pauseBtn.querySelector('.slideshow-btn-icon-pause').removeAttribute('hidden');
            pauseBtn.querySelector('.slideshow-btn-icon-play').setAttribute('hidden', '');
            runInterval();
        } else {
            pauseBtn.setAttribute('data-state', 'play');
            pauseBtn.querySelector('.slideshow-btn-icon-pause').setAttribute('hidden', '');
            pauseBtn.querySelector('.slideshow-btn-icon-play').removeAttribute('hidden');
            clearInterval(slideshowInterval);
        }
    };

    container._esc = (e) => {
        if (e.key === 'Escape') stopSlideshow();
    };
    document.addEventListener('keydown', container._esc);
    container.requestFullscreen().catch(() => {});
}

function stopSlideshow() {
    const container = document.getElementById('slideshow-container');
    clearInterval(slideshowInterval);
    releaseFocusTrap();
    if (container._esc) document.removeEventListener('keydown', container._esc);
    container.style.display = 'none';
    container.setAttribute('aria-hidden', 'true');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// Event Bindings
document.getElementById('searchInput').addEventListener('input', function() {
    const clearButton = document.getElementById('clearButton');
    clearButton.classList.toggle('visible', this.value.length > 0);
});

document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchWallpapers();
});

document.getElementById('searchButton').addEventListener('click', searchWallpapers);
document.getElementById('latestButton').addEventListener('click', showLatestWallpapers);
document.getElementById('clearButton').addEventListener('click', clearSearch);
document.getElementById('slideshowButton').addEventListener('click', startSlideshow);
document.getElementById('closeButton').addEventListener('click', closeFullscreen);
document.getElementById('closeSlideshowButton').addEventListener('click', stopSlideshow);

document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
        updatePagination(currentSearchResults || wallpapers);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const data = currentSearchResults || wallpapers;
    const totalPages = Math.ceil(data.length / wallpapersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayWallpapers(getPaginatedWallpapers(currentPage, data));
        updatePagination(data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Run Application
loadWallpapers();