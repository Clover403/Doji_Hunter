# 📜 TRADING RULES - DojiHunter System

## 🎯 ATURAN UTAMA SISTEM TRADING

Sistem ini menggunakan **Dual-Analysis Strategy** dengan AI (Google Gemini) dan Manual Price Action Analysis.

---

## 📊 STRATEGI ANALISIS

### Mode 1: DUAL ANALYSIS (Normal Operation)
**Kondisi:** AI Service tersedia dan berfungsi

**Aturan:**
1. **KEDUA analisa (AI + Manual) harus mendeteksi Doji**
2. **KEDUA analisa harus memiliki confidence >= 75%**
3. **HANYA jika kedua syarat terpenuhi** → OPEN POSISI

**Contoh:**
```
✅ OPEN POSISI:
- AI: is_doji = true, confidence = 82%
- Manual: is_doji = true, confidence = 78%
→ RESULT: Open posisi dengan confidence rata-rata 80%

❌ TIDAK OPEN:
- AI: is_doji = true, confidence = 82%
- Manual: is_doji = false
→ RESULT: Kedua analisa harus agree, skip trade

❌ TIDAK OPEN:
- AI: is_doji = true, confidence = 65%
- Manual: is_doji = true, confidence = 78%
→ RESULT: AI confidence < 75%, skip trade
```

---

### Mode 2: MANUAL FALLBACK (AI Unavailable)
**Kondisi:** 
- AI Service error (quota limit, network error, etc.)
- AI Service tidak terinstall

**Aturan:**
1. **Manual analysis saja yang digunakan**
2. **Manual harus mendeteksi Doji**
3. **Manual confidence harus >= 75%**
4. **Jika syarat terpenuhi** → OPEN POSISI

**Contoh:**
```
✅ OPEN POSISI:
- AI: unavailable (quota exceeded)
- Manual: is_doji = true, confidence = 78%
→ RESULT: Open posisi dengan manual analysis saja

❌ TIDAK OPEN:
- AI: unavailable
- Manual: is_doji = true, confidence = 68%
→ RESULT: Manual confidence < 75%, skip trade

❌ TIDAK OPEN:
- AI: unavailable
- Manual: is_doji = false
→ RESULT: Manual tidak deteksi Doji, skip trade
```

---

## 🔍 KRITERIA DOJI PATTERN

### Manual Analysis (manual-3candle-v1):
Mencari pola 3-candle Doji dengan kriteria:
1. **Candle 1**: Candle panjang (body > 50% dari range)
2. **Candle 2**: Doji kecil (body < 20% dari range)
3. **Candle 3**: Candle panjang berlawanan arah dengan Candle 1

**Additional Rules:**
- Semua candle harus memiliki range > 0
- Direction reversal harus terjadi
- Shadow analysis untuk konfirmasi

### AI Analysis (Gemini 2.0 Flash):
AI menganalisis:
- Body-to-range ratio
- Shadow lengths (upper & lower)
- Context dari candle sebelumnya
- Price action patterns
- Market structure

---

## 💰 RISK MANAGEMENT

### Order Sizing:
- Volume: 0.1 lot (fixed)
- Risk per trade: 1% (configurable)

### Stop Loss & Take Profit:
```javascript
SL Distance = (High - Low) × 1.5
TP Distance = (High - Low) × 2.0

BUY:
  SL = Doji Low - SL Distance
  TP = Doji Close + TP Distance

SELL:
  SL = Doji High + SL Distance
  TP = Doji Close - TP Distance
```

### Max Open Orders:
- Default: 2 orders maximum
- Configurable via `MAX_OPEN_ORDERS` in `.env`

---

## ⚙️ CONFIGURATION

### Trading Pairs (OPTIMIZED):
```env
# Hanya 1 pair untuk hemat AI quota
TRADING_SYMBOLS=XAUUSD.PRO
```

### Confidence Threshold:
```env
# Fixed di code: 75% untuk kedua analisa
MIN_CONFIDENCE = 0.75
```

### Trading Interval:
```json
// runtime-config.json
{
  "interval_seconds": 900  // 15 minutes
}
```

### Symbols & Timeframe:
```env
TRADING_SYMBOLS=BTCUSD,XAUUSD.PRO
TRADING_TIMEFRAME=M15
```

---

## 🔄 SYSTEM BEHAVIOR

### AI Quota Optimization:
Sistem dioptimasi untuk hemat quota AI:
1. **Hanya 1 pair** (XAUUSD.PRO) - hemat 50% request
2. **Skip AI jika order penuh** - tidak analisa jika sudah ada 2 order
3. **Prompt minimal** - hanya kirim data candle terakhir
4. **Model ringan** - gemini-2.0-flash-lite

### AI Service Status Check:
System akan otomatis detect status AI:
1. **Load time**: Coba load AI service
2. **Runtime**: Jika AI error, graceful fallback ke manual
3. **Error handling**: Catch semua error, tidak crash server

### Auto-Fallback Triggers:
- API key invalid
- Quota exceeded (429 error)
- Network timeout
- Rate limit
- Any API error

### Logging:
Setiap analisa akan log:
```
Mode: dual-confirmed / manual-fallback / dual-rejected
Is Doji: true/false
Confidence: XX%
Reason: Detailed explanation
```

---

## 📈 DECISION MATRIX

| AI Status | AI Doji | AI Conf | Manual Doji | Manual Conf | Result |
|-----------|---------|---------|-------------|-------------|--------|
| ✅ OK | ✅ Yes | ≥75% | ✅ Yes | ≥75% | ✅ **OPEN** |
| ✅ OK | ✅ Yes | ≥75% | ❌ No | - | ❌ Skip |
| ✅ OK | ❌ No | - | ✅ Yes | ≥75% | ❌ Skip |
| ✅ OK | ✅ Yes | <75% | ✅ Yes | ≥75% | ❌ Skip |
| ✅ OK | ✅ Yes | ≥75% | ✅ Yes | <75% | ❌ Skip |
| ❌ Error | - | - | ✅ Yes | ≥75% | ✅ **OPEN** |
| ❌ Error | - | - | ✅ Yes | <75% | ❌ Skip |
| ❌ Error | - | - | ❌ No | - | ❌ Skip |

---

## 🛡️ SAFETY RULES

1. **MT5 Verification Required**
   - Setiap order HARUS diverifikasi di MT5
   - Jika verifikasi gagal, order TIDAK disimpan ke database
   - Database hanya record history, bukan state

2. **Max Orders Check**
   - Check sebelum open posisi
   - Jika sudah max, skip meskipun signal valid

3. **Trading Readiness**
   - MT5 harus connected
   - Account harus login
   - Trading harus enabled

4. **Error Handling**
   - Semua error di-catch
   - Server tidak crash
   - Continue monitoring meskipun ada error

---

## 📝 IMPORTANT NOTES

### ⚠️ TIDAK ADA "Manual Only Mode" Setting
- System SELALU coba gunakan AI jika available
- Fallback ke manual OTOMATIS jika AI error
- Tidak perlu setting manual

### ⚠️ Confidence Threshold FIXED 75%
- Tidak berubah-ubah tergantung mode
- AI mode: 75% untuk kedua analisa
- Manual fallback: 75% untuk manual saja
- Konsisten dan predictable

### ⚠️ AI Error Tidak Mematikan Sistem
- AI quota habis? → Auto fallback ke manual
- Network error? → Auto fallback ke manual
- API key invalid? → Auto fallback ke manual
- System tetap jalan, tetap trading

---

## 🔧 TROUBLESHOOTING

### "No entry signal" terus menerus:
1. **Normal**: Doji pattern tidak selalu muncul
2. Check confidence score di log
3. Pastikan kedua analisa >= 75% (dual mode)
4. Pastikan manual >= 75% (fallback mode)

### AI Quota Exceeded:
1. **Auto-handled**: System otomatis fallback ke manual
2. Manual analysis tetap berfungsi dengan 75% threshold
3. Tunggu quota reset atau upgrade API plan

### Manual confidence selalu < 75%:
1. Pattern memang tidak sempurna (BAGUS! Proteksi)
2. Tunggu pattern yang lebih jelas
3. JANGAN turunkan threshold (berisiko!)

---

## 📊 MONITORING

### Check Analysis Results:
```sql
-- Lihat success rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_doji_detected THEN 1 ELSE 0 END) as doji_found,
  SUM(CASE WHEN status = 'entry' THEN 1 ELSE 0 END) as orders_placed,
  ROUND(100.0 * SUM(CASE WHEN status = 'entry' THEN 1 ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN is_doji_detected THEN 1 ELSE 0 END), 0), 2) as conversion_rate
FROM ai_analyses
WHERE created_at > NOW() - INTERVAL '24 HOURS';
```

### Check API Usage:
```bash
# Test Gemini API
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash \
  -H "x-goog-api-key: YOUR_API_KEY"
```

---

## 🎓 PHILOSOPHY

> **"Trading yang baik adalah trading yang konsisten, bukan trading yang sering."**

Sistem ini dirancang untuk:
- ✅ **Quality over Quantity** - Hanya ambil setup terbaik
- ✅ **Safety First** - Dual confirmation mengurangi false signal
- ✅ **Resilient** - Tetap jalan meskipun ada komponen yang mati
- ✅ **Transparent** - Setiap keputusan tercatat dan dapat diaudit

**Remember**: Tidak ada order lebih baik daripada order yang salah! 🎯

---

**Last Updated**: December 27, 2025  
**Version**: 2.0 (Dual-Analysis Strategy)
