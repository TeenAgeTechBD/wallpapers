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

        cache.data = wallpapers;
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

function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentSearchResults = null;
    currentPage = 1;
    displayWallpapers(getPaginatedWallpapers(currentPage));
    updatePagination();
}

document.getElementById('searchInput').addEventListener('input', function() {
    const clearButton = document.getElementById('clearButton');
    clearButton.classList.toggle('visible', this.value.length > 0);
});

document.getElementById('clearButton').addEventListener('click', function() {
    clearSearch();
});

document.getElementById('slideshowButton').addEventListener('click', startSlideshow);
document.getElementById('closeButton').addEventListener('click', closeFullscreen);
document.getElementById('closeSlideshowButton').addEventListener('click', stopSlideshow);

function getPaginatedWallpapers(page, data = wallpapers) {
    const startIndex = (page - 1) * wallpapersPerPage;
    const endIndex = startIndex + wallpapersPerPage;
    return data.slice(startIndex, endIndex);
}

function updatePagination(data = wallpapers) {
    const totalPages = Math.ceil(data.length / wallpapersPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const paginationEl = document.getElementById('pagination');

    if (data.length === 0) {
        pageInfo.textContent = '';
        paginationEl.classList.add('pagination-hidden');
    } else {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationEl.classList.remove('pagination-hidden');
    }
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

function startSlideshow() {
    if (slideshowInterval) {
        stopSlideshow();
        return;
    }

    const list = currentSearchResults || wallpapers;
    if (!list || list.length === 0) {
        showToast('No wallpapers to show. Load or clear search first.');
        return;
    }

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen mode:', err);
        });
    }

    let currentIndex = 0;
    const slideshowContainer = document.getElementById('slideshow-container');
    const imgElement = document.getElementById('slideshow-image');
    const popup = document.getElementById('slideshow-popup');
    const counterEl = document.getElementById('slideshow-counter');

    slideshowContainer.style.display = 'block';
    slideshowContainer.setAttribute('aria-hidden', 'false');
    document.body.style.cursor = 'none';

    let slideshowPaused = false;
    const pauseBtn = document.getElementById('slideshowPauseButton');
    const downloadBtn = document.getElementById('slideshowDownloadBtn');
    const pauseIcon = pauseBtn.querySelector('.slideshow-btn-icon-pause');
    const playIcon = pauseBtn.querySelector('.slideshow-btn-icon-play');

    const setPauseButtonState = (paused) => {
        pauseBtn.setAttribute('data-state', paused ? 'play' : 'pause');
        pauseBtn.setAttribute('aria-label', paused ? 'Resume slideshow' : 'Pause slideshow');
        pauseBtn.setAttribute('title', paused ? 'Resume' : 'Pause');
        if (pauseIcon) pauseIcon.hidden = paused;
        if (playIcon) playIcon.hidden = !paused;
    };
    setPauseButtonState(false);

    const CURSOR_IDLE_MS = 2000;
    const showCursor = () => {
        document.body.style.cursor = 'auto';
        if (slideshowContainer._cursorHideTimeoutId) clearTimeout(slideshowContainer._cursorHideTimeoutId);
        slideshowContainer._cursorHideTimeoutId = setTimeout(() => {
            document.body.style.cursor = 'none';
            slideshowContainer._cursorHideTimeoutId = null;
        }, CURSOR_IDLE_MS);
    };
    slideshowContainer.addEventListener('mousemove', showCursor);
    slideshowContainer.addEventListener('pointermove', showCursor);
    slideshowContainer._cursorShow = showCursor;

    const updateCounter = () => {
        if (counterEl) counterEl.textContent = `${currentIndex} / ${list.length}`;
    };

    const loadNextWallpaper = () => {
        if (currentIndex >= list.length) currentIndex = 0;
        const wallpaper = list[currentIndex];
        imgElement.classList.remove('fade-in');
        imgElement.src = wallpaper.download_url;
        imgElement.alt = wallpaper.name;
        currentIndex++;
        updateCounter();
        setTimeout(() => imgElement.classList.add('fade-in'), 50);
    };

    pauseBtn.onclick = () => {
        slideshowPaused = !slideshowPaused;
        if (slideshowPaused) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
            setPauseButtonState(true);
        } else {
            slideshowInterval = setInterval(() => {
                imgElement.classList.remove('fade-in');
                setTimeout(loadNextWallpaper, 950);
            }, 6000);
            setPauseButtonState(false);
        }
    };

    downloadBtn.onclick = (e) => {
        e.preventDefault();
        const url = imgElement.src;
        if (!url) return;
        fetch(url)
            .then((res) => res.blob())
            .then((blob) => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = (imgElement.alt || url.split('/').pop()).split('/').pop();
                a.click();
                URL.revokeObjectURL(blobUrl);
            })
            .catch(() => showToast('Download failed. Try opening in new tab.'));
    };

    loadNextWallpaper();
    if (popup) {
        popup.style.display = 'block';
        popup.classList.remove('slideshow-popup-hide');
        setTimeout(() => {
            if (popup) {
                popup.classList.add('slideshow-popup-hide');
                setTimeout(() => { popup.style.display = 'none'; }, 400);
            }
        }, 2500);
    }

    slideshowInterval = setInterval(() => {
        imgElement.classList.remove('fade-in');
        setTimeout(loadNextWallpaper, 950);
    }, 6000);

    const clickHandler = () => window.open(imgElement.src, '_blank');
    imgElement.addEventListener('click', clickHandler);
    slideshowContainer._clickHandler = clickHandler;

    focusTrap(slideshowContainer);
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', escapeHandler);
            stopSlideshow();
        }
    };
    document.addEventListener('keydown', escapeHandler);
    slideshowContainer._escapeHandler = escapeHandler;

    document.getElementById('slideshowButton').textContent = 'Stop Slideshow';
}

function stopSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    const btn = document.getElementById('slideshowButton');
    const container = document.getElementById('slideshow-container');
    if (container && container._escapeHandler) {
        document.removeEventListener('keydown', container._escapeHandler);
        container._escapeHandler = null;
    }
    if (container && container._cursorShow) {
        if (container._cursorHideTimeoutId) clearTimeout(container._cursorHideTimeoutId);
        container.removeEventListener('mousemove', container._cursorShow);
        container.removeEventListener('pointermove', container._cursorShow);
    }
    if (btn) btn.textContent = 'Slideshow';
    if (container) {
        container.style.display = 'none';
        container.setAttribute('aria-hidden', 'true');
        releaseFocusTrap();
        btn.focus();
    }
    document.body.style.cursor = 'auto';
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
}

document.getElementById('searchInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        searchWallpapers();
    }
});

function scrollToGallery() {
    const main = document.querySelector('.main');
    if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
        updatePagination(currentSearchResults || wallpapers);
        scrollToGallery();
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const totalPages = Math.ceil((currentSearchResults || wallpapers).length / wallpapersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
        updatePagination(currentSearchResults || wallpapers);
        scrollToGallery();
    }
});

loadWallpapers();
