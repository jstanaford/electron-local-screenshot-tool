# macOS Screenshot Tool

A desktop application built with Electron.js that enables capturing screenshots by selecting a specific area of the screen through a drag-to-select interface.

## Features

- **Screen Capture**: Select any area of your screen with a drag-to-select interface
- **Visual Feedback**: Transparent overlay with crosshair cursor and real-time dimensions display
- **Flexible Output Options**:
  - Save images to a configurable directory
  - Copy directly to clipboard
  - Upload to a remote server
- **Toast Notifications**: Receive confirmation when screenshots are saved or uploaded
- **System Integration**: Access via system tray icon for quick captures
- **Configurable Settings**: Customize the application to your workflow

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

### Basic Screenshot Workflow

1. Click on the system tray icon (or use the "Capture Screenshot" button in settings)
2. A transparent overlay will appear with a crosshair cursor
3. Click and drag to select the area you want to capture
4. Release the mouse button to display the capture controls
5. Click "Capture" to take the screenshot or "Cancel" to abort
6. The screenshot will be processed according to your settings

### Keyboard Shortcuts

- Press `ESC` while selecting to cancel the capture
- Press `Enter` after selecting an area to capture the screenshot

### Settings

The application provides several configurable settings:

- **Local Storage Options**:
  - Copy to clipboard: Automatically copy screenshots to the clipboard
  - Save to file: Save screenshots as image files
  - Save location: Choose where to save your screenshots

- **Remote Upload** (Optional):
  - Enable remote upload: Send screenshots to a remote server
  - Endpoint URL: Set the API endpoint for your remote server
  - Authentication Token: Provide authentication for the remote API

### Toast Notifications

After capturing a screenshot, a notification will appear with:
- Confirmation message
- Link to open the save location (if saved locally)
- Link to view the image online (if uploaded remotely)

## Development

To run the application in development mode:

```
npm run dev
```

### Project Structure

- `src/main.js` - Main Electron process
- `src/renderer/` - UI components
  - `index.html` - Settings window
  - `capture.html` - Screenshot selection overlay
  - `toast.html` - Notification component

## Remote Upload API

The application supports uploading to a WordPress-based API endpoint with the following request format:

```
POST https://your-endpoint-url/wp-json/wpms/v1/upload
Header: x-wpms-auth: your-auth-token
Body: multipart/form-data with 'file' field containing the image
```

The server is expected to respond with a JSON object containing at least a `url` field pointing to where the image can be viewed online.

## License

MIT License - See the [LICENSE](LICENSE) file for details. 