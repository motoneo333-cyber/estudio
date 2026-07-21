const { exec } = require('child_process');
const path = require('path');

// 1. Start the Express server
const serverProcess = exec('node webapp/server.js', (err, stdout, stderr) => {
    if (err) {
        console.error('Error running server:', err);
        return;
    }
    console.log(stdout);
});

console.log('Express Server is starting on port 3000...');

// 2. Paths
const extensionPath = path.resolve(__dirname, 'extension');
const appUrl = 'http://localhost:3000';

// 3. Command to launch Google Chrome with the extension preloaded
// Depending on the OS, we command Chrome
let chromeCmd;

if (process.platform === 'win32') {
    chromeCmd = `start chrome "${appUrl}" --load-extension="${extensionPath}" --no-first-run`;
} else if (process.platform === 'darwin') {
    chromeCmd = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome "${appUrl}" --load-extension="${extensionPath}" --no-first-run`;
} else {
    // Linux
    chromeCmd = `google-chrome "${appUrl}" --load-extension="${extensionPath}" --no-first-run || google-chrome-stable "${appUrl}" --load-extension="${extensionPath}" --no-first-run || chromium-browser "${appUrl}" --load-extension="${extensionPath}" --no-first-run`;
}

console.log(`Launching Google Chrome with extension preloaded...`);
exec(chromeCmd, (err, stdout, stderr) => {
    if (err) {
        console.warn('Could not automatically launch Chrome. Please open your Chrome and go to: chrome://extensions/ to load the "extension" folder manually.');
    } else {
        console.log('Chrome launched successfully with extension preloaded!');
    }
});
