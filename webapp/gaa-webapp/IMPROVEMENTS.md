# GAA Webapp - Improvements List

**Last Updated:** November 19, 2025

---

## 🔴 CRITICAL (Do First)

### 1. Verify Event Timestamp Sync
**Issue:** Need to confirm Lambda event times match video playback times  
**Impact:** Could break entire video experience if wrong  
**Time:** 30 mins (investigation + fix if needed)  
**Doc:** [POTENTIAL_ISSUES.md](docs/archive/POTENTIAL_ISSUES.md#2-event-timestamps-may-be-wrong)

**Check:**
- Do event timestamps represent time from recording start or match start?
- Frontend expects: Time from recording start (to sync with video)
- Lambda might post: Time from match start (needs adjustment)

---

### 2. Fix Team Colors Metadata
**Issue:** Lambda detects colors but doesn't send them to backend  
**Impact:** Timeline shows black/white instead of actual team colors  
**Time:** 20 mins  
**Status:** Solution documented, ready to implement  
**Doc:** [DATA_CONTRACT.md](docs/architecture/DATA_CONTRACT.md#-required-lambda-changes)

**Fix:**
```python
# In lambda/gaa-ai-analyzer/lambda_handler_s3.py
# Add team_colors to post_results_to_backend()
```

---

## 🟡 HIGH (AI Quality)

### 3. Improve AI Event Detection
**Issue:** Events are generic, missing details  
**Impact:** Low value for coaches  
**Examples:**
- Missing scores (points/goals not detected)
- Generic descriptions ("Home shot" vs "Home scores point from play")
- Incorrect event types

**Fix Options:**
- Refine Gemini prompts
- Increase clip analysis time (currently 60s clips)
- Use Gemini 2.0 Pro instead of Flash
- Add more context between clips

---

### 4. Better Event Descriptions
**Issue:** Descriptions are too generic  
**Current:** "Home shot", "Away kickout"  
**Want:** "Home scores a point from play", "Away kickout won by midfield"

**Fix:** Improve Stage 4 JSON extraction prompt

---

### 5. Score Accuracy
**Issue:** AI misses shots or miscategorizes outcomes  
**Impact:** Scoreboard shows wrong totals  
**Fix:** Better shot detection + outcome classification

---

## 🟢 MEDIUM (User Experience)

### 6. HLS Streaming
**Issue:** Large videos (2.7GB) take forever to load  
**Fix:** AWS MediaConvert to transcode MP4 → HLS  
**Time:** 2-3 hours  
**Benefit:** Fast playback, adaptive bitrate

---

### 7. Presigned URL Expiry
**Issue:** Video URLs expire after 1 hour  
**Fix:** Frontend catches error and refetches game data  
**Time:** 30 mins

---

### 8. Analysis Coverage Indicator
**Issue:** Only first 10 minutes analyzed, but not obvious to user  
**Fix:** Show banner "⚠️ Only first 10 minutes analyzed (0:00 - 10:00)"  
**Time:** 15 mins

---

### 9. Team Mapping Correction
**Issue:** No way to fix if Lambda detects colors wrong  
**Fix:** Add "Swap Teams" button in edit mode  
**Time:** 1 hour

---

## 🔵 LOW (Nice to Have)

### 10. Keyboard Shortcuts Help
**Fix:** Add "?" button showing keyboard shortcuts overlay  
**Time:** 30 mins

---

### 11. Thumbnail Fallbacks
**Fix:** Show placeholder if thumbnail_url is null  
**Time:** 15 mins

---

### 12. Player Name Detection
**Status:** Future enhancement  
**Requires:** Jersey number detection + OCR

---

### 13. Validation Status Display
**Fix:** Show badge on unvalidated AI events  
**Time:** 30 mins

---

### 14. Event Padding Persistence
**Check:** Do trimmer padding changes save to database?  
**Time:** 15 mins (verify + fix if needed)

---

## 📊 Priority Order

1. ✅ **Verify event timestamps** (30 mins) - Could break everything
2. ✅ **Fix team colors** (20 mins) - Easy win
3. ✅ **Improve AI quality** (ongoing) - Main value add
4. **Add analysis coverage indicator** (15 mins) - Avoids confusion
5. **HLS streaming** (2-3 hours) - Better performance
6. **Presigned URL refresh** (30 mins) - Better reliability

---

## 🎯 Recommended Next Steps

1. **Check event timestamp handling** - Verify in Lambda code
2. **Deploy team colors fix** - Already documented
3. **Start AI improvements** - Refine prompts, test different approaches

---

**Source Documents:**
- [POTENTIAL_ISSUES.md](docs/archive/POTENTIAL_ISSUES.md)
- [DATA_CONTRACT.md](docs/architecture/DATA_CONTRACT.md)
- [COMPLETE_FIX_PLAN.md](docs/archive/COMPLETE_FIX_PLAN.md)

