# KitabGhar POS & Uniform ERP - Offline Local Setup & USB Backup Guide

This POS & retail ERP application is engineered for **100% offline desktop operation**, zero-internet dependency, and completely independent of external AI APIs or cloud keys.

---

## 🌟 Key Capabilities
- **100% Offline & Private**: Runs directly on your Windows PC via local SQLite & IndexedDB storage.
- **Zero API Keys**: No Gemini API key or online credentials required.
- **1-Click Launcher**: Double-click `RUN_KITABGHAR_OFFLINE.bat` to launch the POS directly in your browser.
- **USB Flash Drive Destination Picker**: Direct File System Access API allows selecting your USB drive (E:, F:, D:) to save backups.
- **Disaster Data Recovery**: Restore all products, invoices, customers, and financial ledger from your USB backup in seconds.
- **Auto-Backup**: Automated snapshot recording on every sale invoice or daily shift close.

---

## 🚀 How to Run Locally

### Step 1: Install Node.js (First Time Only)
Ensure Node.js (LTS version) is installed on your computer from [https://nodejs.org](https://nodejs.org).

### Step 2: One-Click Installation & Compilation
Double-click `INSTALL_OFFLINE.bat` in the project root directory. This installs local dependencies and builds the production bundle.

### Step 3: Run Offline Anytime
Double-click `RUN_KITABGHAR_OFFLINE.bat`. This automatically boots the local offline server and opens the application at `http://localhost:3000`.

---

## 💾 USB Flash Drive Backup
1. Plug your USB Flash Drive into your PC.
2. In the app header, click the **"USB Backup"** button.
3. Click **"Select USB Flash Drive & Save"**.
4. In the Windows Save Dialog, select your USB Drive (e.g. `E:\` or `D:\`) and click **Save**.
5. Your entire inventory, sales history, customer ledgers, and shop settings are safely stored on your USB flash drive.

---

## 🔄 Disaster Data Recovery
If your computer crashes or you transfer to a new machine:
1. Open KitabGhar POS on the machine.
2. Plug in your USB drive with the backup file.
3. Click **"USB Backup"** -> **"Recover / Restore Data"**.
4. Click **"Select Backup File from USB Flash Drive"** and pick your `.json` backup file.
5. Review the preview metrics (Products, Invoices, Customers) and choose **Clean Restore** or **Safe Merge**.
6. Click **Confirm & Restore All Data Now**. Your full business data is instantly restored.
