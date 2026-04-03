# 💖 Himo AI - Desktop App Setup Guide 💖

Welcome to the official setup guide for **Himo AI Desktop**! 
Since web browsers restrict features like capturing your entire PC screen, controlling system volume, or interacting with other apps, Himo needs to run as a native Desktop Application (.exe) to unlock her full potential.

Follow these step-by-step instructions to build and install Himo on your Windows PC.

---

## 🌟 What You Will Get
By running the Desktop App, Himo can:
- **See your screen** (`capture_screen` tool)
- **Control your PC** (Volume up/down, Brightness, Shutdown/Restart)
- **Control Media** (Play, Pause, Next, Previous)
- **24/7 Auto-Watch** (Monitor the room via webcam and alert you if someone enters)

---

## 🛠️ Prerequisites
Before you begin, make sure you have the following installed on your PC:
1. **Node.js**: Download and install the latest LTS version from [nodejs.org](https://nodejs.org/).
2. **A Code Editor**: [Visual Studio Code (VS Code)](https://code.visualstudio.com/) is highly recommended.
3. **Gemini API Key**: You need an API key from Google AI Studio to power Himo's brain. Get it from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🚀 Step-by-Step Installation

### Step 1: Download the Source Code
1. In this AI Studio interface, look at the top right corner.
2. Click on the **Export** or **Share** button.
3. Select **Download ZIP**.
4. Extract (unzip) the downloaded folder to a location on your PC (e.g., your Desktop or Documents folder).

### Step 2: Open the Project in VS Code
1. Open **VS Code**.
2. Go to `File` > `Open Folder...` and select the folder you just extracted.
3. Open the integrated terminal in VS Code by pressing `` Ctrl + ` `` (or go to `Terminal` > `New Terminal`).

### Step 3: Install Dependencies
In the terminal, run the following command to download all the required packages:
```bash
npm install
```
*(Wait for the installation to finish. It might take a minute or two.)*

### Step 4: Set Up Your API Key
Himo needs your Gemini API key to function.
1. In the root folder of the project, create a new file named exactly `.env`
2. Open the `.env` file and add your API key like this:
```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```
*(Replace `your_actual_api_key_here` with the key you got from Google AI Studio).*

### Step 5: Test the App (Optional but Recommended)
Before building the final `.exe`, you can test if everything works. Run:
```bash
npm run dev:electron
```
This will start the development server and open Himo in a desktop window. Test the camera, microphone, and screen capture. Close it when you are done.

### Step 6: Build the `.exe` Installer
Now, let's create the actual Windows installer! Run this command:
```bash
npm run build:installer
```
- The build process will start. It will compile the React code and package it using Electron Builder.
- This process can take 2-5 minutes depending on your PC's speed.

### Step 7: Install Himo! 🎉
1. Once the build is complete, look in your project folder for a new folder named **`dist_electron`**.
2. Open the `dist_electron` folder.
3. You will find an executable file named something like **`Himo AI Setup 0.0.0.exe`**.
4. Double-click this file to install Himo on your PC.
5. After installation, Himo will launch automatically, and a shortcut will be added to your Desktop and Start Menu!

---

## 🎮 How to Use the New Features

- **24/7 Auto-Watch (Roommate Mode)**: Click the Settings (gear) icon in Himo, and toggle **"Auto-Watch (24/7 Camera Monitoring)"** to ON. Himo will now silently check the camera every 20 seconds and speak up if someone enters the room or if you look sad.
- **Screen Capture**: Just say, *"Mera screen dekho"* or *"What am I doing on my PC?"*
- **Media Control**: Say, *"Music play karo"*, *"Gaana pause karo"*, or *"Next song lagao"*.
- **System Control**: Say, *"Volume badha do"*, *"PC restart kar do"*, etc.

---

## ❓ Troubleshooting

- **Error: "npm is not recognized"**: You haven't installed Node.js properly, or you need to restart your PC after installing it.
- **Himo is mute / API Error**: Double-check your `.env` file. Make sure the variable is named `VITE_GEMINI_API_KEY` and the key is correct.
- **Camera/Screen not working**: Ensure Windows Privacy settings allow desktop apps to access your camera and screen.

Enjoy your new AI Roommate! 💖
