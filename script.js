let wallpapers = [];
let currentPage = 1;
let wallpapersPerPage = calculateWallpapersPerPage();
let slideshowInterval = null;

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
    displayWallpapers(getPaginatedWallpapers(currentPage));
    updatePagination();
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
        imgElement.loading = 'lazy'; // Add lazy loading attribute

        imgElement.onclick = () => {
            openFullscreen(file.download_url);
        };

        const fullscreenButton = document.createElement('button');
        fullscreenButton.classList.add('fullscreen-button');
        fullscreenButton.textContent = '⛶';
        fullscreenButton.onclick = (event) => {
            event.stopPropagation(); // Prevent the image click event from firing
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
    const closeButton = document.getElementById('closeButton');
    const downloadButton = document.getElementById('downloadButton');

    imgElement.src = url;
    downloadButton.href = url;

    fullscreenContainer.style.display = 'block';

    fullscreenContainer.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen mode:', err);
    });
}

function closeFullscreen() {
    const fullscreenContainer = document.getElementById('fullscreen-container');
    fullscreenContainer.style.display = 'none';
    document.exitFullscreen();
}

function searchWallpapers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredWallpapers = wallpapers.filter(file => file.name.toLowerCase().includes(searchTerm));
    currentPage = 1;
    displayWallpapers(getPaginatedWallpapers(currentPage, filteredWallpapers));
    updatePagination(filteredWallpapers);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
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
    const closeButton = document.getElementById('closeSlideshowButton');

    slideshowContainer.style.display = 'block';

    const loadNextWallpaper = () => {
        if (currentIndex >= wallpapers.length) {
            currentIndex = 0;
        }
        const wallpaper = wallpapers[currentIndex];
        imgElement.src = wallpaper.download_url;
        imgElement.alt = wallpaper.name;
        currentIndex++;
    };

    loadNextWallpaper();

    slideshowInterval = setInterval(loadNextWallpaper, 5000);

    document.body.style.cursor = 'none';

    imgElement.addEventListener('click', () => {
        window.open(imgElement.src, '_blank');
    });

    const popup = document.getElementById('slideshow-popup');
    popup.style.display = 'block';

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
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'r') {
        if (slideshowInterval) {
            stopSlideshow();
        }
    }
});

document.getElementById('searchInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        searchWallpapers();
    }
});

document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayWallpapers(getPaginatedWallpapers(currentPage));
        updatePagination();
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const totalPages = Math.ceil(wallpapers.length / wallpapersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayWallpapers(getPaginatedWallpapers(currentPage));
        updatePagination();
    }
});

loadWallpapers();