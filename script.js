let wallpapers = [];
let currentPage = 1;
let wallpapersPerPage = calculateWallpapersPerPage();
let slideshowInterval = null;
let currentSearchResults = null;

let cache = {
    data: null,
    timestamp: null,
    cacheDuration: 60 * 60 * 1000,
};

document.getElementById('currentYear').textContent = new Date().getFullYear();

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

async function loadWallpapers() {
    const repoUrl = 'https://api.github.com/repos/TeenAgeTechBD/wallpapers/contents/wallpapers';

    if (cache.data && Date.now() - cache.timestamp < cache.cacheDuration) {
        wallpapers = cache.data;
        displayWallpapers(getPaginatedWallpapers(currentPage));
        updatePagination();
        return;
    }

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

        displayWallpapers(getPaginatedWallpapers(currentPage));
        updatePagination();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('gallery').innerHTML = '<p style="color:white;">Failed to load wallpapers.</p>';
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
    gallery.innerHTML = '';

    if (files.length === 0) {
        gallery.innerHTML = '<p style="color:white;">No wallpapers found.</p>';
        return;
    }

    files.forEach(file => {
        const imgElement = document.createElement('img');
        imgElement.src = file.download_url;
        imgElement.alt = file.name;
        imgElement.loading = 'lazy';

        imgElement.onclick = () => {
            openFullscreen(file.download_url);
        };

        const fullscreenButton = document.createElement('button');
        fullscreenButton.classList.add('fullscreen-button');
        fullscreenButton.textContent = '⛶';
        fullscreenButton.onclick = (event) => {
            event.stopPropagation();
            openFullscreen(file.download_url);
        };

        const div = document.createElement('div');
        div.classList.add('wallpaper');
        div.appendChild(imgElement);
        div.appendChild(fullscreenButton);
        gallery.appendChild(div);
    });
}

function openFullscreen(url) {
    const fullscreenContainer = document.getElementById('fullscreen-container');
    const imgElement = document.getElementById('fullscreen-image');
    const downloadButton = document.getElementById('downloadBtn');

    imgElement.src = url;

    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            downloadButton.href = blobUrl;

            const filename = url.split('/').pop();
            downloadButton.download = filename;
        })
        .catch(error => console.error('Error fetching the image:', error));

    fullscreenContainer.style.display = 'block';

    fullscreenContainer.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen mode:', err);
    });
}

function closeFullscreen() {
    const fullscreenContainer = document.getElementById('fullscreen-container');
    fullscreenContainer.style.display = 'none';
    document.exitFullscreen();

    displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
    updatePagination(currentSearchResults || wallpapers);
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
    if (this.value.length > 0) {
        clearButton.style.display = 'block';
    } else {
        clearButton.style.display = 'none';
    }
});

document.getElementById('clearButton').addEventListener('click', function() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
});

function getPaginatedWallpapers(page, data = wallpapers) {
    const startIndex = (page - 1) * wallpapersPerPage;
    const endIndex = startIndex + wallpapersPerPage;
    return data.slice(startIndex, endIndex);
}

function updatePagination(data = wallpapers) {
    const totalPages = Math.ceil(data.length / wallpapersPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

function startSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        document.getElementById('slideshowButton').textContent = 'Slideshow';
        document.exitFullscreen();
        document.getElementById('slideshow-container').style.display = 'none';
        document.body.style.cursor = 'auto';
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

    slideshowContainer.style.display = 'block';

    const loadNextWallpaper = () => {
        if (currentIndex >= wallpapers.length) {
            currentIndex = 0;
        }
        const wallpaper = wallpapers[currentIndex];
        imgElement.classList.remove('fade-in');
        imgElement.src = wallpaper.download_url;
        imgElement.alt = wallpaper.name;
        currentIndex++;
        setTimeout(() => {
            imgElement.classList.add('fade-in');
        }, 50);
    };

    loadNextWallpaper();

    slideshowInterval = setInterval(() => {
        imgElement.classList.remove('fade-in');
        setTimeout(() => {
            loadNextWallpaper();
        }, 950);
    }, 6000);

    document.body.style.cursor = 'none';

    imgElement.addEventListener('click', () => {
        window.open(imgElement.src, '_blank');
    });

    setTimeout(() => {
        popup.style.display = 'none';
    }, 2000);

    document.getElementById('slideshowButton').textContent = 'Stop Slideshow';
}

function stopSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    document.getElementById('slideshowButton').textContent = 'Slideshow';
    document.exitFullscreen();
    document.getElementById('slideshow-container').style.display = 'none';
    document.body.style.cursor = 'auto';

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
            console.error('Error attempting to exit fullscreen mode:', err);
        });
    }
}

document.getElementById('searchInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        searchWallpapers();
    }
});

document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
        updatePagination(currentSearchResults || wallpapers);
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const totalPages = Math.ceil((currentSearchResults || wallpapers).length / wallpapersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayWallpapers(getPaginatedWallpapers(currentPage, currentSearchResults || wallpapers));
        updatePagination(currentSearchResults || wallpapers);
    }
});

loadWallpapers();
