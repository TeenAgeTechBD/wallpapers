let wallpapers = [];
const itemsPerPage = 50;
let currentPage = 1;

// Function to load wallpapers from the GitHub repository
async function loadWallpapers() {
    const repoUrl = 'https://api.github.com/repos/itz-rj-here/wallpapers/contents/images?ref=patch-1';
    try {
        const response = await fetch(repoUrl);
        if (!response.ok) throw new Error('Failed to fetch wallpapers');
        const files = await response.json();

        // Store only image files (supports .jpg, .jpeg, .png, and .gif)
        wallpapers = files.filter(file => 
            file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png') || file.name.endsWith('.gif')
        );

        // Shuffle the wallpapers array
        shuffleArray(wallpapers);

        // Display the first page of wallpapers
        displayWallpapers(wallpapers, currentPage);
        createPagination(wallpapers.length, itemsPerPage);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('gallery').innerHTML = '<p style="color:white;">Failed to load wallpapers.</p>';
    }
}

// Function to shuffle an array using the Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];  // Swap elements
    }
}

// Function to display wallpapers in the gallery
function displayWallpapers(files, page) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';  // Clear existing wallpapers

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = files.slice(start, end);

    if (paginatedItems.length === 0) {
        gallery.innerHTML = '<p style="color:white;">No wallpapers found.</p>';
        return;
    }

    paginatedItems.forEach(file => {
        const imgElement = document.createElement('img');
        imgElement.src = file.download_url;  // Load the high-res image directly
        imgElement.alt = file.name;
        imgElement.onerror = () => {
            imgElement.src = 'default-image.jpg';  // Fallback to a default image
            console.error(`Failed to load image: ${file.name}`);
        };

        // Wrap image in an <a> tag with download attribute
        const downloadLink = document.createElement('a');
        downloadLink.href = file.download_url;
        downloadLink.download = file.name;  // Filename for download
        downloadLink.appendChild(imgElement);

        const div = document.createElement('div');
        div.classList.add('wallpaper');
        div.appendChild(downloadLink);
        gallery.appendChild(div);
    });
}

// Function to create pagination controls
function createPagination(totalItems, itemsPerPage) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';  // Clear existing pagination

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages > 1) {
        const prevButton = document.createElement('span');
        prevButton.classList.add('page-link');
        prevButton.textContent = 'Previous';
        prevButton.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                displayWallpapers(wallpapers, currentPage);
                updatePagination();
            }
        };
        pagination.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('span');
            pageLink.classList.add('page-link');
            pageLink.textContent = i;
            pageLink.onclick = () => {
                currentPage = i;
                displayWallpapers(wallpapers, currentPage);
                updatePagination();
            };
            pagination.appendChild(pageLink);
        }

        const nextButton = document.createElement('span');
        nextButton.classList.add('page-link');
        nextButton.textContent = 'Next';
        nextButton.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayWallpapers(wallpapers, currentPage);
                updatePagination();
            }
        };
        pagination.appendChild(nextButton);
    }

    updatePagination();
}

// Function to update pagination controls
function updatePagination() {
    const pageLinks = document.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.classList.remove('active');
        if (parseInt(link.textContent) === currentPage) {
            link.classList.add('active');
        }
    });

    const prevButton = document.querySelector('.page-link:first-child');
    const nextButton = document.querySelector('.page-link:last-child');

    if (currentPage === 1) {
        prevButton.style.display = 'none';
    } else {
        prevButton.style.display = 'inline-block';
    }
    
    if (currentPage === Math.ceil(wallpapers.length / itemsPerPage)) {
        nextButton.style.display = 'none';
    } else {
        nextButton.style.display = 'inline-block';
    }
    }
    
    // Function to search wallpapers based on the search term
    function searchWallpapers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredWallpapers = wallpapers.filter(file => file.name.toLowerCase().includes(searchTerm));
    currentPage = 1;
    displayWallpapers(filteredWallpapers, currentPage);
    createPagination(filteredWallpapers.length, itemsPerPage);
    }
    
    // Enter key support for the search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        searchWallpapers();
    }
    });
    
    // Set the current year in the footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Load and display wallpapers in the original order from GitHub
    loadWallpapers();