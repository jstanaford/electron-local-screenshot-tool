# macOS Screenshot Tool

A desktop application built with Electron.js that enables capturing screenshots by selecting a specific area of the screen through a drag-to-select interface.

## Features

- Transparent, frameless overlay window for screenshot area selection
- Click and drag functionality to define the screenshot area
- Crosshair cursor indicating selection mode
- Real-time dimensions display while selecting
- Save captured images to a file and/or copy to clipboard
- Configurable save directory
- System tray icon for quick access
- macOS-native look and feel

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm start
   ```

## Usage

1. Click on the system tray icon (or use the "Capture Screenshot" button in settings) to start capturing
2. A transparent overlay will appear with a crosshair cursor
3. Click and drag to select the area you want to capture
4. Release the mouse button to display the capture controls
5. Click "Capture" to take the screenshot or "Cancel" to abort
6. The screenshot will be saved to the configured directory and/or copied to clipboard based on your settings

## Keyboard Shortcuts

- Press `ESC` while selecting to cancel the capture
- Press `Enter` after selecting an area to capture the screenshot

## Settings

The application provides several configurable settings:

- **Copy to clipboard**: Automatically copy screenshots to the clipboard
- **Save to file**: Save screenshots as image files
- **Save location**: Choose where to save your screenshots

## Development

To run the application in development mode:

```
npm run dev
```

## License

ISC 