const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const imageFolder = path.join(__dirname, 'images');

app.use(express.static(__dirname));

app.get('/images', (req, res) => {
    fs.readdir(imageFolder, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory');
        }
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const imageFiles = files.filter(file => 
            imageExtensions.some(ext => file.endsWith(ext))
        );
        res.json(imageFiles);
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});