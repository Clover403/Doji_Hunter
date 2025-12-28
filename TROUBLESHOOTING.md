# Troubleshooting Guide - Doji Hunter

## ❌ Tidak Ada Order yang Dibuat

### Penyebab Umum:

#### 1. **Gemini API Quota Habis (429 Error)**
**Gejala:**
- Server berjalan normal tapi tidak pernah membuat order
- Error di console: `429 Too Many Requests` atau `Quota exceeded`
- Log menunjukkan: "AI unavailable - Using Manual Analysis ONLY"

**Solusi:**
```bash
# TIDAK PERLU APA-APA! System otomatis fallback ke manual analysis.
# Manual analysis akan tetap jalan dengan threshold 75%.

# Jika ingin AI kembali aktif:
# Option A: Tunggu quota reset (biasanya per hari/bulan untuk free tier)
# Option B: Dapatkan API key baru dari akun Google berbeda
# Option C: Upgrade ke paid tier
```

**Perilaku System:**
- ✅ System otomatis detect AI error
- ✅ Auto-fallback ke manual analysis (75% threshold)
- ✅ Order tetap bisa dibuat dengan manual saja
- ✅ Tidak perlu restart atau ubah setting

#### 2. **MT5 Bridge Tidak Berjalan**
**Gejala:**
- Error: `MT5 not ready` atau `ECONNREFUSED`

**Solusi:**
```powershell
# Start MT5 Bridge
cd backend/mt5_bridge
python server.py
```

#### 3. **Tidak Ada Doji Pattern Terdeteksi**
**Gejala:**
- Server berjalan, analisis jalan, tapi "No entry signal"
- Log menunjukkan confidence < 75% atau pattern tidak terdeteksi

**Solusi:**
- ✅ **Ini NORMAL dan BAGUS!** - System proteksi bekerja dengan baik
- Doji pattern tidak selalu muncul di setiap candle
- Tunggu sampai pattern benar-benar valid muncul
- Cek log untuk melihat alasan penolakan

**DUAL ANALYSIS Requirements:**
- Jika AI aktif: Kedua (AI + Manual) harus >= 75% DAN keduanya detect Doji
- Jika AI mati: Manual harus >= 75% DAN detect Doji

**⚠️ JANGAN turunkan threshold!** 75% adalah safety threshold yang sudah teruji.

#### 4. **Max Orders Limit Tercapai**
**Gejala:**
- Log menunjukkan: `CANNOT OPEN NEW ORDER: Max open orders reached`

**Solusi:**
```bash
# Edit backend/.env untuk menaikkan limit:
MAX_OPEN_ORDERS=3  # atau lebih tinggi
```

### Cara Test API Gemini:

```javascript
// Jalankan di terminal backend:
node -e "const { GoogleGenerativeAI } = require('@google/generative-ai'); \
const apiKey = 'YOUR_API_KEY'; \
const genAI = new GoogleGenerativeAI(apiKey); \
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); \
(async () => { \
  try { \
    const result = await model.generateContent('Say hello'); \
    const text = (await result.response).text(); \
    console.log('✅ API WORKS:', text); \
  } catch (e) { \
    console.error('❌ API ERROR:', e.message); \
  } \
})()"
```

## ✅ Verifikasi Sistem

### Checklist:
- [ ] Backend server running on port 3000
- [ ] MT5 Bridge running on port 5000 (jika USE_MOCK_MT5=false)
- [ ] Database connected
- [ ] Gemini API key valid (atau MANUAL_ONLY_MODE=true)
- [ ] runtime-config.json memiliki `enabled: true`
- [ ] Symbols di config sesuai dengan MT5

### Test Manual:
```bash
# Test analysis endpoint
curl http://localhost:3000/api/analyze -H "Content-Type: application/json" -d "{\"symbol\":\"BTCUSD\",\"timeframe\":\"M15\"}"

# Check config
curl http://localhost:3000/api/config

# Check trading health (real mode)
curl http://localhost:3000/api/trading/health
```

## 📊 Monitoring

### Check Logs:
```powershell
# Lihat log backend
cd backend
# Jalankan dengan output ke file
node index.js 2>&1 | Tee-Object -FilePath "log.txt"
```

### Cek Database:
```sql
-- Cek analysis records
SELECT * FROM ai_analyses ORDER BY created_at DESC LIMIT 10;

-- Cek orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Cek success rate
SELECT 
  COUNT(*) as total_analyses,
  SUM(CASE WHEN is_doji_detected THEN 1 ELSE 0 END) as doji_detected,
  SUM(CASE WHEN status = 'entry' THEN 1 ELSE 0 END) as orders_placed
FROM ai_analyses;
```

## 🎯 Understanding the Dual-Analysis Strategy

### How It Works:

**Scenario 1: AI Available** (Normal Operation)
```
1. System tries AI analysis
2. System runs Manual analysis
3. Decision:
   - Both detect Doji + Both >= 75% → OPEN POSISI ✅
   - Only one detects Doji → SKIP ❌
   - Both detect but one < 75% → SKIP ❌
```

**Scenario 2: AI Failed** (Auto-Fallback)
```
1. System tries AI → ERROR (quota/network/etc)
2. System auto-fallback to Manual
3. Decision:
   - Manual detect Doji + >= 75% → OPEN POSISI ✅
   - Manual detect Doji but < 75% → SKIP ❌
   - Manual no Doji → SKIP ❌
```

### Log Examples:

**✅ DUAL CONFIRMATION (Trade Executed):**
```
--- Manual Analysis ---
Manual Result: { is_doji: true, confidence: 0.78 }

--- AI Analysis ---
AI Result: { is_doji: true, confidence: 0.82 }

--- Final Decision ---
Mode: dual-confirmed
Is Doji: true
Confidence: 80.00%
Reason: ✅ DUAL CONFIRMATION: AI (82%) + Manual (78%)

🚀 ENTRY SIGNAL DETECTED!
```

**✅ MANUAL FALLBACK (Trade Executed):**
```
--- Manual Analysis ---
Manual Result: { is_doji: true, confidence: 0.76 }

--- AI Analysis ---
⚠️ AI Analysis failed: Quota exceeded

--- Final Decision ---
Mode: manual-fallback
Is Doji: true
Confidence: 76.00%
Reason: ✅ MANUAL ONLY (AI unavailable): 76% confidence

🚀 ENTRY SIGNAL DETECTED!
```

**❌ DUAL REJECTED (No Trade):**
```
--- Manual Analysis ---
Manual Result: { is_doji: true, confidence: 0.78 }

--- AI Analysis ---
AI Result: { is_doji: false, confidence: 0 }

--- Final Decision ---
Mode: manual-only-rejected
Is Doji: false
Confidence: 0.00%
Reason: ❌ Manual detected Doji (78%) but AI did not. Both must agree.

No entry signal: finalDoji=false, confidence=0%
```

## 🔧 Advanced Configuration

### Tuning Confidence Threshold:
Edit `backend/src/services/tradingService.js`:
```javascript
// Ubah nilai ini (default: 0.75 combined, 0.65 manual only)
const MIN_CONFIDENCE = manualOnlyMode ? 0.60 : 0.70;
```

### Tuning Trading Interval:
Edit `backend/runtime-config.json`:
```json
{
  "interval_seconds": 300  // 5 menit (default: 900 = 15 menit)
}
```

## 📞 Support

Jika masalah masih berlanjut:
1. Cek error di console backend
2. Cek database untuk analysis records
3. Verifikasi MT5 connection (jika real trading)
4. Test Gemini API secara manual
