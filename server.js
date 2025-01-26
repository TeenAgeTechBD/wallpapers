const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the "wallpapers" directory
app.use('/wallpapers', express.static(path.join(__dirname, 'wallpapers')));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/wallpapers', (req, res) => {
    const wallpapersDir = path.join(__dirname, 'wallpapers');
    fs.readdir(wallpapersDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read wallpapers directory' });
        }
        const imageFiles = files.filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
        res.json(imageFiles);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});