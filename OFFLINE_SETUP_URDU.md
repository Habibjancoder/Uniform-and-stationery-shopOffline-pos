# KitabGhar POS & Uniform ERP - آف لائن چلانے اور یو ایس بی بیک اپ کی مکمل گائیڈ
## (Offline Setup Guide in Roman Urdu & Urdu)

Yeh software dukan (Stationery, School Uniforms, School Bags, Books & General Retail) k liye **100% OFFLINE** banaya gaya hai.

---

### 🌟 اہم خصوصیات (Key Features):
1. **0% Internet Needed**: Internet bilkul band hone par bhi software 100% tezi se kaam karega.
2. **Baghair Gemini API Key**: Kisi Gemini API key, credit card ya online cloud account ki zaroorat NAHI hai.
3. **1-Click Run File**: Sirf `RUN_KITABGHAR_OFFLINE.bat` par 2 dafa click (Double Click) karein aur POS open ho jaye ga!
4. **USB Flash Drive Backup**: Jab aap "USB Backup" par click karenge to Windows File Explorer open hoga, jahan aap apni USB Drive (Drive E:, F:, ya D:) select kar k backup save kar sakte hain.
5. **Auto-Backup (خودکار بیک اپ)**: Har invoice banne par ya rozana shift close par auto backup snapshot banta hai.
6. **Disaster Data Recovery (ڈیٹا ریکوری)**: Agar aap ka computer kharab ho jaye, Windows format ho jaye, ya app delete ho jaye to USB lagayein aur 1-Click se pura data wapis recover karein!

---

## 🛠️ پہلا مرحلہ: کمپیوٹر پر انسٹال کرنا (First Time Setup)

### 1. Node.js چیک کریں:
- Apne Windows computer par check karein k Node.js installed hai ya nahi.
- Agar installed nahi hai to **https://nodejs.org** se LTS version download kar k install kar lein (sirf 2 minute lagte hain).

### 2. فولڈر کو کمپیوٹر پر رکھیں:
- Is app ka pura folder apne computer main kisi bhi jagah (maslan `D:\KitabGhar` ya `C:\KitabGhar`) rakh lein.

### 3. پہلی بار سیٹ اپ رن کریں:
- Folder k andar mojood **`INSTALL_OFFLINE.bat`** file par double-click karein.
- Yeh tamam packages install kar k offline production build bana dega.

---

## 🚀 روزانہ چلانے کا طریقہ (Daily 1-Click Offline Run)

1. Rozana subah dukan kholte hi folder main mojood **`RUN_KITABGHAR_OFFLINE.bat`** file par double-click karein.
2. Yeh khud hi local server start kar k aap k computer k browser (Google Chrome ya Microsoft Edge) main software open kar dega:
   **http://localhost:3000**
3. POS Billing, Barcode Scanning, Thermal Receipt Printing, Stock & Udhaar Khata sab kuch offline chalega.
4. Internet ki taar nikal dein ya Wi-Fi band kar dein, tab bhi yeh bilkul sahi kaam karega!

---

## 💾 یو ایس بی فلیش ڈرائیو میں بیک اپ لینے کا طریقہ (USB Backup Steps)

1. Apni **USB Flash Drive** computer main lagayein.
2. App k upar header main **"USB Backup"** button par click karein.
3. Ek popup modal open hoga:
   - Click karein: **"Select USB Flash Drive & Save (یو ایس بی سلیکٹ کر کے محفوظ کریں)"**
4. Windows ka File Dialog open hoga:
   - Apni USB Drive (e.g. `E:\`, `F:\`, ya `D:\Backups`) select karein.
   - File ka naam pehle se likha hoga (e.g. `KitabGhar_USB_Backup_2026-10-08.json`).
   - **Save** par click karein!
5. Pura database (Tamam Books, Uniforms, Invoices, Customers, Udhaar balances) foran USB main save ho jaye ga.

---

## 🔄 ڈیٹا ڈیلیٹ ہونے پر یو ایس بی سے ریکوری (Data Recovery & Restore Steps)

Agar aap ka computer badal jaye ya kisi wajah se app delete/format ho jaye:

1. Naye computer par KitabGhar POS open karein.
2. Apni **USB Flash Drive** computer main lagayein.
3. App main **"USB Backup"** button par click karein aur **"Recover / Restore Data"** tab par jayein.
4. **"Select Backup File from USB Flash Drive"** par click karein aur apni USB se `.json` backup file select karein.
5. App aap ko preview dikhaye ga:
   - Dukan ka naam
   - Products / Items ki tadad
   - Sales Invoices ki tadad
   - Customers & Udhaar balances ki tadad
6. Do options milenge:
   - **1. Complete Clean Restore**: Purana data mita kar USB wala naya data fresh load karega.
   - **2. Safe Merge**: Mojooda data bhi rakhega aur USB se izafi records add kar dega.
7. **"Confirm & Restore All Data Now"** par click karein.
8. Kuch seconds main aap ka pura business data 100% wapis aa jaye ga!

---

## ❓ عام سوالات (FAQ)

**س: کیا مجھے انٹرنیٹ یا گوگل اکاؤنٹ کی ضرورت ہے؟**  
ج: جی نہیں! یہ سسٹم 100% لوکل مشین پر چلتا ہے اور اس کے لیے کسی انٹرنیٹ کی ضرورت نہیں ہے۔

**س: کیا مجھے کوئی Gemini API Key درج کرنی پڑے گی؟**  
ج: جی نہیں! تمام سرچ، بارکوڈ کیلکولیشن، پرافٹ رپورٹس، اور اسٹاک کا نظام لوکل بنایا گیا ہے، کسی API Key کی ضرورت نہیں ہے۔

**س: کیا میں ڈیٹا کو ایکسل (Excel) میں بھی ایکسپورٹ کر سکتا ہوں؟**  
ج: جی ہاں! پروڈکٹس، سیلز، کسٹمر لیجر، اور ایکسپینسز کو کسی بھی وقت Excel (.xlsx) یا PDF میں ایکسپورٹ کیا جا سکتا ہے۔
