let wallpapers = [];
let currentPage = 1;
const wallpapersPerPage = 12; // Number of wallpapers to display per page

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