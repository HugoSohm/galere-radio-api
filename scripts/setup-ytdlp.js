const fs = require('fs');
const path = require('path');
const https = require('https');

const isWindows = process.platform === 'win32';
const filename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${filename}`;
const filePath = path.join(__dirname, '..', filename);

console.log(`Downloading yt-dlp for ${process.platform}...`);

function downloadFile(downloadUrl, targetPath) {
    https.get(downloadUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            return downloadFile(res.headers.location, targetPath);
        }

        if (res.statusCode !== 200) {
            console.error(`Error: Server responded with ${res.statusCode}`);
            process.exit(1);
        }

        const fileStream = fs.createWriteStream(targetPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
            fileStream.close();
            console.log('Download completed successfully!');

            if (!isWindows) {
                fs.chmodSync(targetPath, '755');
                console.log('Set executable permissions.');
            }
            process.exit(0);
        });

    }).on('error', (err) => {
        console.error(`Network error: ${err.message}`);
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        process.exit(1);
    });
}

downloadFile(url, filePath);
