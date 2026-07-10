# Lazy TypeTest

**Lazy TypeTest** is a Chrome extension that converts selected text on any webpage into an interactive typing test directly within the browser. This tool is designed to allow users to practice and monitor their typing speed and accuracy seamlessly.

## Features

- **In-Place Typing Test:** Select any text on a webpage and instantly convert it into a typing test environment.
- **Real-time Statistics:** Monitor elapsed time, typing speed (Words Per Minute), and accuracy during the test.
- **Detailed Results:** View graphical representations of Words Per Minute progression upon test completion.
- **History Dashboard:** Maintain a comprehensive log of past tests, highest recorded WPM, and active streaks.
- **Theme Compatibility:** Automatically adapts to the visual aesthetics (dark or light mode) of the selected text's environment.

## Screenshots

![Screenshot 1](./Screenshot%202026-07-08%20003302.png)
![Screenshot 2](./Screenshot%202026-07-08%20222258.png)

## Installation

As this extension is currently unlisted on the Chrome Web Store, it must be installed locally using the following steps:

1. Clone or download this repository to the local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle located in the top right corner.
4. Click the **Load unpacked** button in the top left corner.
5. Select the downloaded `Lazy_TypeTest` directory.
6. The extension is now installed and can be pinned to the browser toolbar for quick access.

## Usage Guide

1. Highlight the desired text on any website.
2. Right-click the highlighted text to open the context menu.
3. Select the **Lazy TypeTest** option from the context menu (alternatively, utilize the extension popup).
4. An interactive overlay will appear over the text, signaling the start of the typing test.
5. Press `Tab` to skip the current word or `ESC` to terminate the test prematurely.

## Technology Stack

- HTML, CSS, JavaScript
- Chrome Extensions API (Manifest V3, Service Workers, Storage, Context Menus)
- HTML5 Canvas for graphical rendering
