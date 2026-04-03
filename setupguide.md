# 🚀 Himo AI Assistant - Setup & Build Guide

Is guide me hum seekhenge ki kaise aap Himo AI Assistant ke code ko apne VS Code me setup kar sakte hain, usme changes kar sakte hain aur uski `.exe` file bana kar install kar sakte hain.

---

## 📋 Prerequisites (Zaroori Cheezein)

Shuru karne se pehle, aapke computer me ye cheezein honi chahiye:

1.  **Node.js (v18 or higher)**: [Download here](https://nodejs.org/)
2.  **Git**: [Download here](https://git-scm.com/) (Optional, code download karne ke liye)
3.  **VS Code**: [Download here](https://code.visualstudio.com/)

---

## 📥 1. Code Setup (Importing to VS Code)

1.  Sabse pehle code ko ek folder me extract karein ya Git se clone karein.
2.  **VS Code** open karein.
3.  `File > Open Folder` par click karein aur Himo AI Assistant ka folder select karein.
4.  VS Code me `Terminal > New Terminal` open karein.

---

## 📦 2. Dependencies Install Karna

Terminal me niche di gayi command run karein:

```bash
npm install
```

Ye command saare zaroori packages (React, Vite, Electron, etc.) install kar degi.

---

## 🔑 3. Environment Variables Setup

1.  Folder me `.env.example` file ko copy karein aur uska naam badal kar `.env` kar dein.
2.  `.env` file open karein aur apni API Key daalein:
    *   `GEMINI_API_KEY`: Google AI Studio se lein.

---

## 🛠️ 4. Development Mode Me Run Karna

Agar aap code me changes karke live check karna chahte hain:

### Web Browser Me:
```bash
npm run dev
```
Phir browser me `http://localhost:3000` open karein.

### Desktop App (Electron) Me:
```bash
npm run dev:electron
```
Isse ek desktop window open ho jayegi jisme aapka app chalega.

---

## 🏗️ 5. Executable (.exe) Build Karna

Jab aapka code ready ho jaye aur aap uski `.exe` file banana chahte hain:

### Option A: Portable EXE (Single File)
Terminal me run karein:
```bash
npm run build:electron
```
Ya fir folder me `build_desktop.bat` file par double-click karein.

### Option B: Installer (Setup File)
Terminal me run karein:
```bash
npm run build:installer
```
Ya fir folder me `build_installer.bat` file par double-click karein.

**Note**: Build hone ke baad aapki `.exe` file `dist_electron` folder me mil jayegi.

---

## 🐞 6. Troubleshooting (Common Errors)

1.  **"npm is not recognized"**: Iska matlab Node.js install nahi hai ya PATH me nahi hai. Node.js reinstall karein.
2.  **"Missing API Key"**: App chalne ke baad settings me ja kar API key check karein ya `.env` file verify karein.
3.  **Build Fail**: Agar build fail hota hai, toh `dist` aur `dist_electron` folders ko delete karke dobara try karein.
4.  **Camera/Mic Permission**: Desktop app me pehli baar run karte waqt Windows aapse permission maangega, use Allow karein.

---

## ✨ Customization Tips

*   **UI Changes**: `src/App.tsx` me ja kar styles aur layout change karein.
*   **Orb Customization**: `src/components/HimoOrb.tsx` me orb ke animations aur colors change karein.
*   **System Controls**: `electron/main.js` me naye system commands (Shutdown, Volume, etc.) add karein.

Ab aap ready hain Himo ko apna banane ke liye! 🌸🔥 Kuch aur help chahiye toh bata dena! 😉
