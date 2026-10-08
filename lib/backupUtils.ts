/**
 * KitabGhar POS - USB Flash Drive & Offline Storage Utilities
 * Provides File System Access API for USB selection, browser fallbacks,
 * and direct offline launcher script generation.
 */

export interface SaveBackupResult {
  success: boolean;
  method: 'filesystem_api' | 'download' | 'canceled';
  fileName: string;
  error?: string;
}

/**
 * Saves a backup file either by prompting the user to select their USB Flash Drive / Folder
 * via the native browser File System Access API (showSaveFilePicker), or falling back to
 * standard browser download.
 */
export async function saveBackupToUsbOrDrive(
  suggestedFileName: string,
  jsonData: string
): Promise<SaveBackupResult> {
  // Check if native File System Access API is supported (Chrome 86+, Edge, Opera on Desktop)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const pickerOpts = {
        suggestedName: suggestedFileName,
        types: [
          {
            description: 'KitabGhar POS Backup File (*.json)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      };

      // Native Windows Explorer save dialog opens here, allowing user to navigate to USB Drive (E:, F:, D:)
      const fileHandle = await (window as any).showSaveFilePicker(pickerOpts);
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(jsonData);
      await writableStream.close();

      return {
        success: true,
        method: 'filesystem_api',
        fileName: fileHandle.name || suggestedFileName,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked Cancel in the file picker dialog
        return {
          success: false,
          method: 'canceled',
          fileName: suggestedFileName,
        };
      }
      console.warn('showSaveFilePicker failed or was blocked, falling back to download:', err);
      // Fallback to download below
    }
  }

  // Fallback: Standard browser download prompt
  try {
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedFileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);

    return {
      success: true,
      method: 'download',
      fileName: suggestedFileName,
    };
  } catch (err: any) {
    return {
      success: false,
      method: 'download',
      fileName: suggestedFileName,
      error: err.message,
    };
  }
}

/**
 * Generates and downloads the Windows 1-Click Offline Launcher Batch file
 */
export function downloadOfflineBatchLauncher() {
  const batContent = `@echo off
title KitabGhar POS - Offline Windows Edition
color 0A
cls
echo ======================================================================
echo           KITABGHAR POS & UNIFORM ERP - 100%% OFFLINE RUNNER
echo      (Baghair Internet & Baghair Gemini API Key k Direct Chalane Ka Script)
echo ======================================================================
echo.
echo [1/3] Checking Node.js runtime environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org
    echo.
    echo Installation k baad dobara is file par double-click karein.
    pause
    exit /b
)

echo [OK] Node.js is ready.
echo.
echo [2/3] Checking dependencies & starting local server on port 3000...
if not exist "node_modules" (
    echo Installing packages for the first time...
    call npm install
)

echo.
echo [3/3] Launching KitabGhar POS in your browser...
echo Local Address: http://localhost:3000
echo Offline Mode: ACTIVE (No Internet & No API Key Needed)
echo.

:: Open Google Chrome or MS Edge or default browser
start "" http://localhost:3000

:: Start the Next.js server
if exist ".next" (
    call npm run start
) else (
    call npm run dev
)

pause
`;

  const blob = new Blob([batContent], { type: 'application/x-bat;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'RUN_KITABGHAR_OFFLINE.bat';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Generates and downloads the Roman Urdu offline instructions file
 */
export function downloadUrduGuideFile() {
  const guideText = `================================================================================
KITABGHAR POS & UNIFORM ERP - BAGHAIR INTERNET AUR BAGHAIR GEMINI API KEY CHALANE KA TAREEQA
================================================================================

Yeh software 100% OFFLINE kaam karta hai. Is ko chalane k liye:
- Kisi Internet Connection ki zaroorat NAHI hai.
- Kisi Gemini API Key ya online account ki zaroorat NAHI hai.
- Aap ka sara data (Books, Uniforms, Invoices, Udhaar Ledger) aap k computer par hi rehta hai.

--------------------------------------------------------------------------------
STEP 1: COMPUTER PAR SETUP (SIRF PEHLI BAAR)
--------------------------------------------------------------------------------
1. Apne computer par Node.js install karein (Agar pehle se nahi hai):
   Website: https://nodejs.org (LTS Version download karein).
2. Is app ka pura folder apne computer main kisi bhi drive (e.g. C:\\KitabGhar ya D:\\KitabGhar) main rakhein.
3. Pehli baar "INSTALL_OFFLINE.bat" file par double-click karein.
   Yeh zaroori files install kar k app ko prepare kar dega.

--------------------------------------------------------------------------------
STEP 2: ROZANA APP DIRECT RUN KARNE KA TAREEQA (1-CLICK RUN)
--------------------------------------------------------------------------------
1. Bas "RUN_KITABGHAR_OFFLINE.bat" file par 2 dafa click (Double-Click) karein.
2. Yeh khud hi local server shuru kar k aap k browser (Chrome ya Edge) main
   POS software open kar dega (http://localhost:3000).
3. Internet band hone par bhi yeh 100% tezi se kaam karega!

--------------------------------------------------------------------------------
STEP 3: USB FLASH DRIVE MAIN BACKUP LENE KA TAREEQA
--------------------------------------------------------------------------------
1. Apni USB Flash Drive computer main lagayein.
2. App k upar header main "USB Backup" button par click karein.
3. "Select USB Flash Drive to Save" par click karein.
4. Computer ka folder dialog open hoga: Apni USB Drive (E:, F:, ya D:) select karein aur Save par click karein.
5. Pura database (Tamam Kitabein, Uniforms, Invoices, Customers) foran USB main save ho jaye ga.

--------------------------------------------------------------------------------
STEP 4: AGAR APP YA COMPUTER CRASH HO JAYE TO DATA RECOVER (RESTORE) KARNA
--------------------------------------------------------------------------------
1. Naye computer par software open karein.
2. USB Flash Drive lagayein.
3. App main "USB Backup & Recovery Center" open karein.
4. "Select Backup File from USB" par click karein aur USB se backup file (.json) select karein.
5. App aap ko preview dikhaye ga (Kitne products, kitne bills, kitne customers hain).
6. "Confirm & Restore All Data" par click karein.
7. Chand seconds main aap ka pura business data 100% wapis aa jaye ga!

================================================================================
Kamyabi k sath chalayein! KitabGhar POS - Complete Offline Retail Solution.
================================================================================
`;

  const blob = new Blob([guideText], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'LOCAL_SETUP_GUIDE_URDU.txt';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}
