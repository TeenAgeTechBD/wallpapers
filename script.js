let wallpapers = [];
let currentPage = 1;
const wallpapersPerPage = 12; // Number of wallpapers to display per page
let slideshowInterval = null; // To store the slideshow interval

// Cache for storing fetched wallpapers
let cache = {
    data: null,
    timestamp: null,
    cacheDuration: 60 * 60 * 1000, // Cache duration: 1 hour
};

// Set the current year in the footer
document.getElementById('currentYear').textContent = new Date().getFullYear();

async function loadWallpapers() {
    const repoUrl = 'https://api.github.com/repos/TeenAgeTechBD/wallpapers/contents/wallpapers'; // Updated API URL

    // Check if cached data is still valid
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

        // Store only image files (supports .jpg, .jpeg, and .png)
        wallpapers = files.filter(file =>
            file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')
        );

        // Cache the fetched data
        cache.data = wallpapers;
        cache.timestamp = Date.now();

        // Shuffle the wallpapers array
        shuffleArray(wallpapers);

        // Display the first page of wallpapers
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
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

function displayWallpapers(files) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = ''; // Clear existing wallpapers

    if (files.length === 0) {
        gallery.innerHTML = '<p style="color:white;">No wallpapers found.</p>';
        return;
    }

    files.forEach(file => {
        const imgElement = document.createElement('img');
        imgElement.src = file.download_url; // Load the high-res image directly
        imgElement.alt = file.name;

        // Wrap image in an <a> tag with download attribute
        const downloadLink = document.createElement('a');
        downloadLink.href = file.download_url;
        downloadLink.download = file.name; // Filename for download
        downloadLink.appendChild(imgElement);

        const div = document.createElement('div');
        div.classList.add('wallpaper');
        div.appendChild(downloadLink);
        gallery.appendChild(div);
    });
}

function searchWallpapers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredWallpapers = wallpapers.filter(file => file.name.toLowerCase().includes(searchTerm));
    currentPage = 1; // Reset to the first page after search
    displayWallpapers(getPaginatedWallpapers(currentPage, filteredWallpapers));
    updatePagination(filteredWallpapers);
}

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

// Slideshow functionality
function startSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval); // Stop existing slideshow
        slideshowInterval = null;
        document.getElementById('slideshowButton').textContent = 'Slideshow';
        document.exitFullscreen(); // Exit fullscreen
        document.body.removeChild(document.getElementById('slideshow-container')); // Remove slideshow container
        document.body.style.cursor = 'auto'; // Restore cursor
        return;
    }

    // Enter fullscreen mode
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen mode:', err);
        });
    }

    // Start the slideshow
    let currentIndex = 0;
    const slideshowContainer = document.createElement('div');
    slideshowContainer.id = 'slideshow-container';
    slideshowContainer.style.position = 'fixed';
    slideshowContainer.style.top = '0';
    slideshowContainer.style.left = '0';
    slideshowContainer.style.width = '100%';
    slideshowContainer.style.height = '100%';
    slideshowContainer.style.backgroundColor = '#2e3440';
    slideshowContainer.style.zIndex = '10000';
    slideshowContainer.style.display = 'flex';
    slideshowContainer.style.justifyContent = 'center';
    slideshowContainer.style.alignItems = 'center';
    slideshowContainer.style.overflow = 'hidden';
    document.body.appendChild(slideshowContainer);

    const imgElement = document.createElement('img');
    imgElement.style.width = '100%';
    imgElement.style.height = '100%';
    imgElement.style.objectFit = 'cover'; // Ensure the image covers the entire screen
    imgElement.style.borderRadius = '0'; // Remove border radius for fullscreen
    slideshowContainer.appendChild(imgElement);

    // Function to load the next wallpaper
    const loadNextWallpaper = () => {
        if (currentIndex >= wallpapers.length) {
            currentIndex = 0; // Loop back to the first wallpaper
        }
        const wallpaper = wallpapers[currentIndex];
        imgElement.src = wallpaper.download_url; // Load the high-res image directly
        imgElement.alt = wallpaper.name;
        currentIndex++;
    };

    // Load the first wallpaper immediately
    loadNextWallpaper();

    // Change wallpaper every 5 seconds
    slideshowInterval = setInterval(loadNextWallpaper, 5000);

    // Hide cursor during slideshow
    document.body.style.cursor = 'none';

    // Open image in a new tab when clicked
    imgElement.addEventListener('click', () => {
        window.open(imgElement.src, '_blank');
    });

    // Show popup after entering fullscreen
    const popup = document.createElement('div');
    popup.id = 'slideshow-popup';
    popup.textContent = 'Press CTRL+R to exit slideshow';
    document.body.appendChild(popup);

    // Display the popup
    popup.style.display = 'block';

    // Hide the popup after 2 seconds
    setTimeout(() => {
        popup.style.display = 'none';
        document.body.removeChild(popup); // Remove popup from DOM
    }, 2000);

    // Update button text
    document.getElementById('slideshowButton').textContent = 'Stop Slideshow';
}

// Event listener for CTRL+R to exit slideshow
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'r') {
        if (slideshowInterval) {
            clearInterval(slideshowInterval); // Stop slideshow
            slideshowInterval = null;
            document.getElementById('slideshowButton').textContent = 'Slideshow';
            document.exitFullscreen(); // Exit fullscreen
            document.body.removeChild(document.getElementById('slideshow-container')); // Remove slideshow container
            document.body.style.cursor = 'auto'; // Restore cursor
        }
    }
});

// Event listeners
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

// Load and display wallpapers on page load
loadWallpapers();