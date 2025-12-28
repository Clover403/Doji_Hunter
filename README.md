# 🤖 DojiHunter - AI Trading Bot (REAL TRADING)

DojiHunter adalah sistem trading otomatis berbasis AI yang terintegrasi dengan MetaTrader 5 untuk **EKSEKUSI TRADING NYATA**.

---

## ⚠️ PERINGATAN PENTING

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        PERINGATAN TRADING NYATA                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Sistem ini mengeksekusi TRADING NYATA dengan UANG NYATA.                   ║
║  Semua order yang dibuat akan masuk ke MetaTrader 5 terminal Anda.          ║
║                                                                              ║
║  ATURAN KRITIS:                                                             ║
║  • MT5 adalah SATU-SATUNYA SUMBER KEBENARAN untuk posisi aktif              ║
║  • Jika posisi tidak ada di MT5, maka TIDAK ADA                             ║
║  • Database hanya untuk HISTORICAL records, BUKAN live state                 ║
║  • TIDAK ADA mock/dummy data dalam mode produksi                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 Daftar Isi

1. [Tentang Aplikasi](#-tentang-aplikasi)
2. [Arsitektur Sistem](#-arsitektur-sistem)
3. [Persyaratan Sistem](#-persyaratan-sistem)
4. [Instalasi](#-instalasi)
5. [Konfigurasi](#-konfigurasi)
6. [Cara Menjalankan](#-cara-menjalankan)
7. [API Endpoints](#-api-endpoints)
8. [Struktur Folder](#-struktur-folder)
9. [Trading Rules](#-trading-rules)
10. [Troubleshooting](#-troubleshooting)

---

## 📖 Tentang Aplikasi

DojiHunter adalah sistem trading yang menggabungkan:
- **AI Analysis** menggunakan Google Gemini untuk prediksi market
- **Pattern Detection** untuk mendeteksi pola Doji candlestick
- **Real-time Execution** langsung ke MetaTrader 5
- **Web Dashboard** untuk monitoring dan kontrol

### Teknologi:

| Komponen | Teknologi | Port |
|----------|-----------|------|
| Backend | Node.js + Express.js | 3000 |
| MT5 Bridge | Python + Flask | 5000 |
| Frontend | React + Vite + TailwindCSS | 5173 |
| Database | SQLite + Sequelize | - |
| AI | Google Gemini API | - |

---

## 🏗 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEB DASHBOARD                                      │
│                      React (http://localhost:5173)                          │
│                    Monitoring ONLY - No Trading Logic                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVER                                      │
│                   Node.js + Express (Port 3000)                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────────────┐ │
│  │  AI Service   │  │Trading Service│  │     SQLite Database             │ │
│  │ (Gemini AI)   │  │               │  │   (HISTORY ONLY - not truth)   │ │
│  └───────────────┘  └───────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MT5 BRIDGE                                          │
│                   Python + Flask (Port 5000)                                │
│                                                                             │
│   CRITICAL: All trading operations go through here                          │
│   - Verifies every order with positions_get()                               │
│   - Prints account info on startup                                          │
│   - Returns error if MT5 not connected                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ MetaTrader5 Python API
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      METATRADER 5 TERMINAL                                   │
│            ════════════════════════════════════════════                      │
│            ║   SINGLE SOURCE OF TRUTH FOR POSITIONS   ║                      │
│            ════════════════════════════════════════════                      │
│                                                                             │
│   • All active positions MUST be verified here                              │
│   • If not in positions_get(), it DOES NOT EXIST                           │
│   • Real money, real trades, real consequences                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Persyaratan Sistem

### Software Wajib:

| Software | Versi | Download |
|----------|-------|----------|
| Node.js | v18+ | https://nodejs.org |
| Python | 3.8+ | https://python.org |
| MetaTrader 5 | Latest | https://www.metatrader5.com |

### Python Packages:
```bash
pip install Flask MetaTrader5
```

### Node.js Dependencies:
```bash
npm install  # di folder backend dan frontend
```

---

## 🔧 Instalasi

### Step 1: Clone Project
```bash
cd Doji_Hunter
```

### Step 2: Install Backend
```bash
cd backend
npm install
```

### Step 3: Install Frontend
```bash
cd ../frontend
npm install
```

### Step 4: Install Python MT5 Bridge
```bash
cd ../backend/mt5_bridge
pip install Flask MetaTrader5
```

---

## ⚙️ Konfigurasi

### Environment Variables

Buat file `.env` di folder `backend/`:

```env
# Server
PORT=3000

# MT5 Bridge Connection
MT5_BRIDGE_URL=http://localhost:5000

# CRITICAL: Set to 'false' for REAL trading
USE_MOCK_MT5=false

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
USE_MOCK_AI=false

# Trading Parameters
TRADING_SYMBOLS=BTCUSD,ETHUSD
TRADING_TIMEFRAME=M15
TRADING_INTERVAL=900
```

### ⚠️ MODE KRITIS:

| Variable | Value | Efek |
|----------|-------|------|
| `USE_MOCK_MT5=false` | **PRODUKSI** | Trading NYATA ke MT5 |
| `USE_MOCK_MT5=true` | Testing | Tidak ada trade nyata |

---

## 🚀 Cara Menjalankan

### Urutan Wajib:

```
1. Buka MetaTrader 5 → Login ke akun trading
2. Jalankan MT5 Bridge (Python)
3. Jalankan Backend (Node.js)
4. Jalankan Frontend (React) - opsional
```

### Metode 1: Script Otomatis (Windows)

```cmd
start_server.bat
```

### Metode 2: Manual (Disarankan untuk Debugging)

#### Terminal 1 - MT5 Bridge (JALANKAN PERTAMA)
```bash
cd Doji_Hunter/backend/mt5_bridge
python server.py
```

**Output yang HARUS muncul:**
```
============================================================
INITIALIZING MT5 CONNECTION...
============================================================
✅ MT5 CONNECTED SUCCESSFULLY
============================================================
   Account Number : 12345678
   Account Name   : John Doe
   Server         : BrokerName-Server
   Balance        : 10000.00 USD
   Leverage       : 1:100
   Trade Allowed  : True
   Trade Expert   : True
============================================================

🚀 STARTING MT5 BRIDGE SERVER
============================================================
   Mode: REAL TRADING
   Port: 5000
============================================================
```

⚠️ **Jika account info tidak muncul, MT5 BELUM TERHUBUNG!**

#### Terminal 2 - Backend
```bash
cd Doji_Hunter/backend
node index.js
```

**Output yang diharapkan:**
```
INDEX.JS STARTED
✅ REAL MT5 MODE - Orders will execute on MT5
✅ Server running on port 3000
```

#### Terminal 3 - Frontend (Opsional)
```bash
cd Doji_Hunter/frontend
npm run dev
```

---

## 🌐 Akses Aplikasi

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| MT5 Bridge | http://localhost:5000 |

---

## 📡 API Endpoints

### Health & Status

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | Basic health check |
| GET | `/api/health/trading` | **CRITICAL** - Cek kesiapan trading |
| GET | `/api/status` | Status sistem |

### Posisi & Orders

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/positions/active` | **POSISI AKTIF DARI MT5** (source of truth) |
| GET | `/api/orders/history` | Historical orders dari database |
| GET | `/api/orders?source=active` | Posisi aktif dari MT5 |
| POST | `/api/orders/sync` | Sync database dengan MT5 |

### Trading

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/analyze` | Trigger analisis manual |
| GET | `/api/candles` | Data candlestick dari MT5 |
| GET | `/api/config` | Konfigurasi trading |
| POST | `/api/config` | Update konfigurasi |

### MT5 Bridge Endpoints (Port 5000)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Status bridge |
| GET | `/health/trading` | **CRITICAL** - Verifikasi trading ready |
| GET | `/positions` | Semua posisi dari MT5 |
| GET | `/positions/<ticket>` | Verifikasi posisi spesifik |
| POST | `/order` | Eksekusi order |
| POST | `/close/<ticket>` | Tutup posisi |
| GET | `/account` | Info akun MT5 |

---

## 📁 Struktur Folder

```
Doji_Hunter/
├── backend/
│   ├── index.js                 # Entry point + API routes
│   ├── package.json
│   ├── .env                     # ⚠️ KONFIGURASI PENTING
│   ├── config/
│   │   └── config.js            # Database config
│   ├── models/                  # Sequelize models
│   │   ├── aianalysis.js
│   │   ├── aimodelresult.js
│   │   └── order.js
│   ├── src/services/
│   │   ├── mt5Service.js        # Client untuk MT5 Bridge
│   │   ├── tradingService.js    # Logic trading utama
│   │   ├── aiService.js         # Google Gemini AI
│   │   └── manualAnalyzer.js    # Pattern detection
│   └── mt5_bridge/
│       ├── server.py            # ⚠️ Flask server untuk MT5
│       ├── mt5_mock.py          # Mock untuk testing
│       └── libs/                # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── ...
│   │   └── services/
│   │       └── api.js
│   └── package.json
│
├── start_server.bat             # Script start Windows
└── README.md                    # Dokumentasi ini
```

---

## 📜 Trading Rules

### Alur Order:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORDER EXECUTION FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Trading Service mengirim order ke MT5 Bridge                    │
│                          ↓                                          │
│  2. MT5 Bridge mengirim order ke mt5.order_send()                  │
│                          ↓                                          │
│  3. Verifikasi retcode == TRADE_RETCODE_DONE (10009)               │
│                          ↓                                          │
│  4. Query positions_get() untuk konfirmasi posisi ada              │
│                          ↓                                          │
│  5. HANYA JIKA STEP 4 SUKSES → Simpan ke database                  │
│                                                                     │
│  ⚠️ Jika step 3 atau 4 gagal:                                       │
│     - Order TIDAK disimpan ke database                              │
│     - Return error ke client                                        │
│     - TIDAK ADA silent failure                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Aturan Ketat:

1. **MT5 = Source of Truth**
   - Dashboard menampilkan posisi dari MT5, BUKAN database
   - Jika MT5 return 0 posisi, dashboard HARUS kosong

2. **No Silent Failures**
   - Semua error dilaporkan dengan jelas
   - Tidak ada fallback ke dummy data

3. **Database = History Only**
   - Database menyimpan record untuk analisis historis
   - BUKAN untuk menentukan posisi aktif

4. **Verification Required**
   - Setiap order HARUS diverifikasi di MT5
   - Order tanpa verifikasi = GAGAL

---

## 🔧 Troubleshooting

### ❌ Error: "initialize() failed"

**Penyebab:** MT5 terminal tidak terbuka atau tidak login.

**Solusi:**
1. Buka MetaTrader 5
2. Login ke akun trading
3. Aktifkan AutoTrading (tombol hijau di toolbar)
4. Restart MT5 Bridge

### ❌ Error: "Trading not allowed"

**Penyebab:** Akun tidak mengizinkan trading.

**Solusi:**
1. Cek apakah akun demo/real
2. Aktifkan "Allow automated trading" di MT5 → Tools → Options → Expert Advisors
3. Cek apakah weekend (market tutup)

### ❌ Error: "ECONNREFUSED localhost:5000"

**Penyebab:** MT5 Bridge belum berjalan.

**Solusi:**
1. Pastikan MT5 Bridge sudah dijalankan PERTAMA
2. Cek output - harus ada "Account Number" dan "Trade Allowed"
3. Cek firewall

### ❌ Dashboard Menampilkan Order yang Tidak Ada di MT5

**Penyebab:** Database tidak sync dengan MT5.

**Solusi:**
1. Panggil endpoint `POST /api/orders/sync`
2. Cek `/api/positions/active` - ini yang benar
3. Database orders adalah HISTORY, bukan live state

### ❌ Order Gagal Tapi Tidak Ada Error

**TIDAK BOLEH TERJADI** dalam sistem ini. Jika terjadi:
1. Cek log MT5 Bridge - harus ada print detail
2. Cek `retcode` dari order_send()
3. Verifikasi dengan `/positions/<ticket>`

---

## 🖥️ Verifikasi Sistem Ready

Sebelum trading, SELALU cek:

```bash
# 1. Cek MT5 Bridge
curl http://localhost:5000/health/trading

# Response yang benar:
{
  "ready": true,
  "checks": {
    "mt5_connected": true,
    "account_logged_in": true,
    "trading_allowed": true,
    "can_fetch_positions": true
  },
  "message": "READY for trading"
}

# 2. Cek Backend
curl http://localhost:3000/api/health/trading
```

**Jika `ready: false` → JANGAN TRADING!**

---

## 📞 Quick Start

```bash
# 1. Buka MetaTrader 5 dan login

# 2. Terminal 1 - MT5 Bridge (WAJIB PERTAMA)
cd backend/mt5_bridge
python server.py
# Tunggu sampai muncul "Account Number: xxxxx"

# 3. Terminal 2 - Backend
cd backend
node index.js

# 4. Terminal 3 - Frontend (opsional)
cd frontend
npm run dev

# 5. Verifikasi
curl http://localhost:5000/health/trading
# Harus "ready": true

# 6. Buka dashboard
# http://localhost:5173
```

---

## 📄 License

MIT License

---

**🎯 DojiHunter - Real Trading with AI Intelligence**

```
Remember: If it's not in MT5, it doesn't exist.
```
