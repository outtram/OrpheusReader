# Add Detailed Conversion History View

<objective>
Enhance the conversion history feature to display comprehensive details about each conversion, including the original text, all TTS settings used, uploaded file information, and the generated audio. This enables users to understand what parameters produced specific results and easily recreate or tweak conversions.

This is for personal productivity - when reviewing past conversions, users need to see exactly what settings and text produced the output, so they can replicate successful settings or adjust parameters for better results.
</objective>

<context>
The OrpheusReader TTS application currently has a history page that shows basic conversion information (title, date, duration). However, it doesn't display:
- The original text that was converted
- TTS settings used (voice, temperature, top_p, max_new_tokens, repetition_penalty)
- Original filename if a file was uploaded
- Ability to view these details in a modal or detailed view

Users need this information to:
1. Understand what settings produced specific audio quality
2. Recreate successful conversions with similar settings
3. Tweak parameters and re-run conversions
4. Keep track of what files were processed

Current architecture:
- Storage: File-based JSON in `./conversions/metadata.json`
- History page: `./src/frontend/history.html`
- Backend: Express server in `./src/backend/server.js`

Thoroughly analyze the current implementation to understand the data flow and UI patterns before implementing changes.
</context>

<requirements>

## Data Storage Requirements

1. **Expand metadata.json schema** to include:
   - `originalText`: Full text that was converted
   - `ttsSettings`: Object containing all TTS parameters
     - `voice`: Voice used (e.g., "tara")
     - `temperature`: Temperature value
     - `top_p`: Top P value
     - `max_new_tokens`: Max tokens value
     - `repetition_penalty`: Repetition penalty value
   - `originalFileName`: Original filename if file was uploaded (optional)
   - `provider`: TTS provider used

2. **Backward compatibility**: Existing conversions without these fields should still display properly

## Backend Requirements

1. **Update storage.js** (`./src/backend/utils/storage.js`):
   - Modify `saveConversion()` to accept and store TTS settings
   - Ensure all new fields are persisted to metadata.json

2. **Update server.js** (`./src/backend/server.js`):
   - Pass TTS settings to storage when saving conversions
   - Include original filename from multer file upload

3. **Add API endpoint** (if needed):
   - GET `/api/conversions/:id/details` - Return full conversion details including text and settings

## Frontend Requirements

1. **Update history.html** (`./src/frontend/history.html`):
   - Add "View Details" button to each conversion card
   - Create a modal/detail panel that displays:
     - Original text (with copy button)
     - All TTS settings in a readable format
     - Original filename (if applicable)
     - Audio player
     - Download button
     - "Use These Settings" button (optional: pre-fills main form)

2. **Update history page JavaScript**:
   - Handle click events to open detail view
   - Fetch full conversion details from API
   - Display settings in a clean, organized layout
   - Implement copy-to-clipboard for text

3. **Apple-inspired design**:
   - Modal overlay with blur background
   - Clean card layout for settings
   - Organized sections: Text, Settings, Audio
   - Smooth open/close animations

## UI/UX Requirements

1. **Detail Modal Layout**:
   ```
   ┌─────────────────────────────────────┐
   │ [X] Close       Conversion Details  │
   ├─────────────────────────────────────┤
   │                                     │
   │ Title: "Article Name"               │
   │ Date: January 15, 2025              │
   │ Duration: 5:32                      │
   │                                     │
   │ ▼ Original Text                     │
   │ ┌─────────────────────────────────┐ │
   │ │ [Full text content here...]     │ │
   │ │                                 │ │
   │ └─────────────────────────────────┘ │
   │ [Copy Text]                         │
   │                                     │
   │ ▼ TTS Settings                      │
   │ • Voice: Tara                       │
   │ • Temperature: 0.6                  │
   │ • Top P: 0.95                       │
   │ • Max Tokens: 1200                  │
   │ • Repetition Penalty: 1.1           │
   │                                     │
   │ ▼ Audio Output                      │
   │ [Audio Player Controls]             │
   │ [Download MP3]                      │
   │                                     │
   └─────────────────────────────────────┘
   ```

2. **Responsive Design**:
   - Full-screen modal on mobile
   - Centered modal on desktop (max-width: 800px)
   - Scrollable content if text is long

</requirements>

<implementation>

## Implementation Steps

1. **Examine Current Code**
   - Read `@./src/backend/utils/storage.js` to understand current schema
   - Read `@./src/frontend/history.html` to see existing UI
   - Read `@./conversions/metadata.json` to see current data structure
   - Read `@./src/backend/server.js` to find where conversions are saved

2. **Update Backend Storage**
   - Modify `saveConversion()` in storage.js to accept and store:
     - `ttsSettings` object
     - `originalText` string
     - `originalFileName` string (optional)
   - Update the JSON schema documentation in comments
   - Ensure atomic writes are maintained

3. **Update Server Endpoint**
   - In `server.js`, modify the `/api/convert` POST endpoint to:
     - Save TTS settings object to conversion record
     - Save original filename from `req.file.originalname` if file uploaded
     - Save full text content
   - Verify existing GET `/api/conversions/:id` returns all fields

4. **Create Detail Modal UI**
   - Add modal HTML structure to history.html
   - Use semantic sections: header, text-section, settings-section, audio-section
   - Add "View Details" button to each conversion card
   - Include close button and overlay for modal

5. **Style the Modal**
   - Create CSS in `./src/frontend/styles.css`:
     - `.modal-overlay`: Full-screen backdrop with blur effect
     - `.modal-content`: Centered card with Apple aesthetic
     - `.detail-section`: Collapsible sections for text/settings/audio
     - Smooth fade-in animation on open
   - Match existing Apple-inspired design system

6. **Add JavaScript Functionality**
   - Update history page script or create new file:
     - `openDetailModal(conversionId)`: Fetch and display details
     - `closeDetailModal()`: Hide modal with animation
     - `copyTextToClipboard()`: Copy original text
     - Handle keyboard events (ESC to close)
   - Use fetch API to get conversion details
   - Populate modal with data dynamically

7. **Handle Edge Cases**
   - Long text: Limit display height with scrolling
   - Missing fields: Show "N/A" for old conversions without settings
   - File uploads: Display filename prominently
   - Error states: Show friendly message if conversion not found

8. **Test Thoroughly**
   - Create new conversion with settings and verify all data is saved
   - Open detail view and verify all fields display correctly
   - Test with old conversions (backward compatibility)
   - Test copy text functionality
   - Test modal open/close animations
   - Verify responsive design on mobile

## What to Avoid (and Why)

- **Don't modify existing conversions**: Keep backward compatibility so old records without settings still work
- **Don't store redundant data**: Audio file path is already in metadata, don't duplicate
- **Don't use alert()**: Use elegant modal dialogs consistent with Apple design
- **Don't break atomic writes**: Storage operations must remain atomic to prevent corruption
- **Don't load all text into memory**: For very long texts, consider pagination or truncation in the display

</implementation>

<output>

Modify the following files:

- `./src/backend/utils/storage.js` - Update schema and saveConversion function
- `./src/backend/server.js` - Save TTS settings and filename when creating conversions
- `./src/frontend/history.html` - Add detail modal structure and View Details buttons
- `./src/frontend/styles.css` - Add modal and detail view styling
- `./src/frontend/history.js` - Add modal open/close and data fetching logic (or update existing script)

Do not modify:
- Audio generation logic
- Chunking algorithm
- Provider implementations

</output>

<verification>

Before declaring complete, verify your work:

1. **Test new conversion**: Create a conversion with custom settings and verify:
   - All TTS settings are saved to metadata.json
   - Original text is stored
   - Filename is saved (if file uploaded)

2. **Test detail view**: Click "View Details" on a conversion and verify:
   - Modal opens with smooth animation
   - All settings display correctly
   - Original text displays in full
   - Audio player works
   - Copy text button works
   - Close button works
   - ESC key closes modal

3. **Test backward compatibility**: If any old conversions exist without settings:
   - They still display in history list
   - Detail view shows "N/A" or defaults for missing fields
   - No errors in console

4. **Test responsive design**:
   - Modal looks good on desktop (centered, max-width)
   - Modal is full-screen on mobile
   - Content scrolls if needed

5. **Test edge cases**:
   - Very long text (5000+ characters)
   - Conversion with missing optional fields
   - Multiple rapid modal open/close

Run a complete end-to-end test:
- Create conversion with file upload + custom settings
- Navigate to history page
- Click "View Details"
- Verify all information is correct
- Copy text to clipboard
- Close modal
- Reopen and verify data persists

</verification>

<success_criteria>

The implementation is successful when:

1. ✅ New conversions save all TTS settings to metadata.json
2. ✅ Original text is stored with each conversion
3. ✅ Original filename is saved for file uploads
4. ✅ "View Details" button appears on each history card
5. ✅ Clicking opens a modal with all conversion information
6. ✅ Modal displays: text, settings, audio player, download button
7. ✅ Copy text button works correctly
8. ✅ Modal has smooth open/close animations
9. ✅ Design matches Apple-inspired aesthetic
10. ✅ Backward compatible with existing conversions
11. ✅ Responsive on mobile and desktop
12. ✅ ESC key closes modal
13. ✅ No console errors
14. ✅ Code is clean, commented, and maintainable

</success_criteria>

<extended_thinking>

For maximum efficiency, whenever you need to perform multiple independent operations (like reading storage.js, history.html, and server.js), invoke all relevant tools simultaneously rather than sequentially.

After receiving tool results, carefully reflect on the current implementation patterns - especially the storage schema and UI components - and determine optimal next steps before proceeding. The modal design should feel native to the existing Apple-inspired interface.

Consider the user journey: they're reviewing past conversions to understand what worked well. The detail view should make it immediately obvious what settings produced the audio, and make it easy to copy or reference that information.
</extended_thinking>
