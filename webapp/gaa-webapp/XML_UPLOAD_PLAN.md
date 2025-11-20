# XML Upload/Download Feature

**Goal:** Allow users to upload XML stats, edit them in the UI, and download edited XML.

---

## Flow

```
Upload XML → Parse to events → Save to DB → User edits → Download XML
```

---

## Frontend Changes

### `GameStats.tsx`
Add two buttons next to "Export to PDF":

```tsx
<div className="flex gap-2">
  <button onClick={handleImportXML}>Import XML</button>
  <button onClick={handleExportXML}>Export XML</button>
  <button onClick={exportToPDF}>Export to PDF</button>
</div>
```

**Import XML:**
- Opens file picker
- User selects `.xml` file
- POST to `/api/games/:id/upload-xml`
- Refreshes events display

**Export XML:**
- GET `/api/games/:id/export-xml`
- Downloads file as `{game-title}-stats.xml`

---

## Backend Routes

### `POST /api/games/:id/upload-xml`
```javascript
// 1. Receive XML file (multipart/form-data)
// 2. Parse XML → events JSON
// 3. Save to games.events
// 4. Return success
```

**TODO:** XML parsing logic (need XML format)

### `GET /api/games/:id/export-xml`
```javascript
// 1. Read games.events from DB
// 2. Convert events JSON → XML
// 3. Return XML file
```

**TODO:** XML generation logic (need XML format)

---

## Database

No changes needed - `games.events` already stores JSONB.

Optional: Add `games.source_type` (enum: 'ai', 'xml_upload', 'manual')

---

## XML Format (Pending)

**Need from VM:**
- Sample XML file
- Schema/structure
- Required fields
- How to map XML events ↔ our events JSON

**Current events JSON format:**
```json
{
  "id": "evt_123",
  "type": "point",
  "timestamp": 45.2,
  "team": "home",
  "metadata": {
    "action": "Shot",
    "outcome": "Point",
    "scoreType": "point"
  }
}
```

---

## Tasks

- [ ] Frontend: Add Import/Export buttons
- [ ] Frontend: File upload modal
- [ ] Frontend: Download XML file
- [ ] Backend: Upload XML endpoint (with TODO for parsing)
- [ ] Backend: Export XML endpoint (with TODO for generation)
- [ ] Get XML format from VM
- [ ] Implement XML ↔ JSON conversion
- [ ] Test with real XML file

---

**Status:** 🟡 Structure ready, waiting for XML format  
**Blocked by:** XML format from VM

