let wallpapers = [];

// Function to load wallpapers from the GitHub repository
async function loadWallpapers() {
    const repoUrl = 'https://api.github.com/repos/itz-rj-here/wallpapers/contents/images/';
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

        // Display the wallpapers in the order they appear in GitHub
        displayWallpapers(wallpapers);
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
function displayWallpapers(files) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';  // Clear existing wallpapers

    if (files.length === 0) {
        gallery.innerHTML = '<p style="color:white;">No wallpapers found.</p>';
        return;
    }

    files.forEach(file => {
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

// Function to search wallpapers based on the search term
function searchWallpapers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredWallpapers = wallpapers.filter(file => file.name.toLowerCase().includes(searchTerm));
    displayWallpapers(filteredWallpapers);
}

// Enter key support for the search input
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        searchWallpapers();
    }
});

// Load and display wallpapers in the original order from GitHub
loadWallpapers();