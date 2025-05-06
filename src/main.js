const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  clipboard,
  shell,
  dialog,
  desktopCapturer
} = require('electron');
const path = require('path');
const fs = require('fs-extra');
const got = require('got');
const FormData = require('form-data');

// We'll initialize the store after imports
let store;

// Initialize app after we have the store
async function initializeApp() {
  // Initialize settings store using dynamic import
  const { default: Store } = await import('electron-store');
  
  store = new Store({
    defaults: {
      saveDirectory: app.getPath('pictures'),
      saveToClipboard: true,
      saveToFile: true,
      enableRemoteUpload: false,
      endpointUrl: '',
      authToken: ''
    }
  });
  
  createMainWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

let mainWindow = null;
let captureWindow = null;
let tray = null;
let isCapturing = false;
let toastWindow = null;
let lastScreenshotPath = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  
  // Hide window instead of closing when user clicks the close button
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

function createCaptureWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  captureWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    transparent: true,
    frame: false,
    fullscreen: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  captureWindow.loadFile(path.join(__dirname, 'renderer/capture.html'));

  captureWindow.on('closed', () => {
    captureWindow = null;
    isCapturing = false;
  });
}

function createTray() {
  // Check if tray already exists
  if (tray !== null) {
    console.log('Tray already exists, not creating another one');
    return;
  }

  // Create a simple 16x16 icon as a template image for macOS
  const iconSize = 16;
  const trayIcon = nativeImage.createEmpty();
  
  // Create a simple white dot pattern for the icon
  const imageData = Buffer.alloc(iconSize * iconSize * 4);
  
  // Fill with a simple pattern (white circle)
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const offset = (y * iconSize + x) * 4;
      const centerX = iconSize / 2;
      const centerY = iconSize / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      if (distance < iconSize / 3) {
        // White pixel (R, G, B, A)
        imageData[offset] = 255;     // R
        imageData[offset + 1] = 255; // G
        imageData[offset + 2] = 255; // B
        imageData[offset + 3] = 255; // A
      } else {
        // Transparent pixel
        imageData[offset] = 0;       // R
        imageData[offset + 1] = 0;   // G
        imageData[offset + 2] = 0;   // B
        imageData[offset + 3] = 0;   // A
      }
    }
  }
  
  const icon = nativeImage.createFromBuffer(imageData, { width: iconSize, height: iconSize });
  icon.setTemplateImage(true); // Important for macOS
  
  // Create the tray
  tray = new Tray(icon);
  
  // Set up the context menu
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Capture Screenshot', 
      click: () => {
        startCapture();
      } 
    },
    { 
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Screenshot Tool');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    startCapture();
  });
  
  console.log('Tray created with programmatic icon');
}

function startCapture() {
  if (isCapturing) return;
  
  isCapturing = true;
  
  if (!captureWindow) {
    createCaptureWindow();
  }
  
  captureWindow.show();
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// IPC events for screenshot capture
ipcMain.on('start-capture', () => {
  startCapture();
});

ipcMain.on('cancel-capture', () => {
  if (captureWindow) {
    captureWindow.hide();
    isCapturing = false;
  }
});

function createToastWindow(message, screenshotPath, remoteUrl) {
  // Save the screenshot path for later use
  if (screenshotPath) {
    lastScreenshotPath = screenshotPath;
  }
  
  // Don't create multiple toast windows
  if (toastWindow) {
    toastWindow.close();
    toastWindow = null;
  }
  
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Create a small window for the toast
  toastWindow = new BrowserWindow({
    width: 300,
    height: 60,
    x: 20,
    y: height - 80, // Position at bottom left with some margin
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Load the toast HTML file
  toastWindow.loadFile(path.join(__dirname, 'renderer/toast.html'));
  
  // When ready to show, send data and make visible
  toastWindow.once('ready-to-show', () => {
    toastWindow.webContents.send('toast-data', {
      message: message,
      hasPath: !!screenshotPath,
      remoteUrl: remoteUrl
    });
    toastWindow.show();
  });
  
  // Clean up on close
  toastWindow.on('closed', () => {
    toastWindow = null;
  });
}

// Add this IPC handler for the 'open-screenshot-location' event
ipcMain.on('open-screenshot-location', () => {
  if (lastScreenshotPath) {
    // Get the directory path from the file path
    const directoryPath = path.dirname(lastScreenshotPath);
    shell.openPath(directoryPath);
  }
});

// Add this IPC handler for the 'close-toast' event
ipcMain.on('close-toast', () => {
  if (toastWindow) {
    toastWindow.close();
  }
});

// Now modify the existing capture-screenshot handler to show a toast notification
ipcMain.on('capture-screenshot', async (event, { x, y, width, height }) => {
  try {
    // Hide the capture window to avoid it being in the screenshot
    if (captureWindow) {
      captureWindow.hide();
    }
    
    // Wait a bit for UI to disappear
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the specified screen region
    const sources = await screen.getAllDisplays();
    const primaryDisplay = sources[0]; // Assuming primary display for simplicity
    
    const image = await screenshot({
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(width),
      height: Math.floor(height)
    });
    
    // Save to clipboard if enabled
    if (store.get('saveToClipboard')) {
      clipboard.writeImage(image);
    }
    
    // Save to file if enabled
    if (store.get('saveToFile')) {
      const saveDirectory = store.get('saveDirectory');
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const filePath = path.join(saveDirectory, `screenshot-${timestamp}.png`);
      
      fs.ensureDirSync(saveDirectory);
      fs.writeFileSync(filePath, image.toPNG());
      
      // Perform remote upload if enabled
      let remoteUrl = null;
      if (store.get('enableRemoteUpload')) {
        remoteUrl = await uploadToRemoteServer(filePath);
      }
      
      // Show toast notification with file path and/or remote URL
      let message = 'Screenshot saved!';
      if (remoteUrl) {
        message = 'Screenshot saved and uploaded!';
      }
      
      createToastWindow(message, filePath, remoteUrl);
      
      event.reply('screenshot-saved', {
        success: true,
        path: filePath,
        remoteUrl: remoteUrl
      });
    } else {
      // Show toast notification without file path
      createToastWindow('Screenshot copied to clipboard!');
      
      event.reply('screenshot-saved', {
        success: true
      });
    }
    
    isCapturing = false;
    
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    // Show error toast
    createToastWindow(`Error: ${error.message}`);
    event.reply('screenshot-saved', {
      success: false,
      error: error.message
    });
    isCapturing = false;
  }
});

// Helper function to take a screenshot of a specific region
async function screenshot({ x, y, width, height }) {
  // Ensure we don't have invalid dimensions
  if (width < 1 || height < 1) {
    throw new Error('Invalid screenshot dimensions');
  }
  
  // Get all screens
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Use desktopCapturer to capture the primary screen
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height
    }
  });
  
  // We'll use the first source which should be the primary display
  const source = sources[0];
  
  // If we couldn't get a source, throw an error
  if (!source) {
    throw new Error('Could not capture screen');
  }
  
  // Get the thumbnail which is the full screenshot
  const thumbnail = source.thumbnail;
  
  // Crop to the selected region
  return thumbnail.crop({ x, y, width, height });
}

// IPC for settings
ipcMain.handle('get-settings', async () => {
  return {
    saveDirectory: store.get('saveDirectory'),
    saveToClipboard: store.get('saveToClipboard'),
    saveToFile: store.get('saveToFile'),
    enableRemoteUpload: store.get('enableRemoteUpload'),
    endpointUrl: store.get('endpointUrl'),
    authToken: store.get('authToken')
  };
});

ipcMain.on('set-settings', (event, settings) => {
  if (settings.saveDirectory) {
    store.set('saveDirectory', settings.saveDirectory);
  }
  if (typeof settings.saveToClipboard === 'boolean') {
    store.set('saveToClipboard', settings.saveToClipboard);
  }
  if (typeof settings.saveToFile === 'boolean') {
    store.set('saveToFile', settings.saveToFile);
  }
  if (typeof settings.enableRemoteUpload === 'boolean') {
    store.set('enableRemoteUpload', settings.enableRemoteUpload);
  }
  if (settings.endpointUrl) {
    store.set('endpointUrl', settings.endpointUrl);
  }
  if (settings.authToken) {
    store.set('authToken', settings.authToken);
  }
});

ipcMain.on('choose-directory', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    store.set('saveDirectory', result.filePaths[0]);
    event.reply('directory-selected', result.filePaths[0]);
  }
});

// Open the screenshot folder
ipcMain.on('open-save-directory', () => {
  const saveDirectory = store.get('saveDirectory');
  if (fs.existsSync(saveDirectory)) {
    shell.openPath(saveDirectory);
  }
});

// Add a function to handle remote uploads
async function uploadToRemoteServer(filePath) {
  try {
    // Check if remote upload is enabled and we have all required settings
    if (!store.get('enableRemoteUpload')) {
      return null;
    }
    
    const endpointUrl = store.get('endpointUrl');
    const authToken = store.get('authToken');
    
    if (!endpointUrl || !authToken) {
      console.error('Remote upload settings are incomplete');
      return null;
    }
    
    // Create form data for the request
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    // Make the request
    const response = await got.post(endpointUrl, {
      body: form,
      headers: {
        'x-wpms-auth': authToken
      },
      responseType: 'json'
    });
    
    // Return the URL from the response
    if (response.body && response.body.url) {
      return response.body.url;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to upload to remote server:', error);
    return null;
  }
}

// Add a new IPC handler to open the remote URL
ipcMain.on('open-remote-url', (event, url) => {
  if (url) {
    shell.openExternal(url);
  }
});

// This line should be at the end of the file if it's not already there
app.whenReady().then(() => {
  // Make sure we only initialize once
  if (!mainWindow) {
    initializeApp();
  }
}); 