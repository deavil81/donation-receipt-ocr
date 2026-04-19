/**
 * RUNNER: Select this function and hit 'Run' in Apps Script.
 */
function processAllReceipts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const srcFolder = DriveApp.getFolderById(CONFIG.SOURCE_FOLDER_ID);
  const destFolder = DriveApp.getFolderById(CONFIG.PROCESSED_FOLDER_ID);
  
  const files = srcFolder.getFiles();
  
  if (!files.hasNext()) {
    console.log("No new receipts found in folder.");
    return;
  }

  while (files.hasNext()) {
    const file = files.next();
    
    // Process only images
    if (file.getMimeType().startsWith('image/')) {
      try {
        console.log("Processing: " + file.getName());
        
        // 1. OCR Step
        const rawText = performOCR(file);
        
        // 2. Data Extraction Step
        const data = extractDetails(rawText);
        
        // 3. Update Sheet (Matches Columns A to J)
        sheet.appendRow([
          rawText.substring(0, CONFIG.MAX_RAW_TEXT_LENGTH), // A: Raw text
          "",            // B: Recipients no.
          data.date,     // C: Date
          "",            // D: Name
          "",            // E: Address
          data.mobile,   // F: Mobile No.
          data.amount,   // G: Amount
          "",            // H: Amount Words
          "",            // I: Payment Mode
          "Donation"     // J: Purpose
        ]);
        
        // 4. Move file to Processed folder
        destFolder.addFile(file);
        srcFolder.removeFile(file);
        
        console.log("Successfully processed: " + file.getName());
      } catch (e) {
        console.log("Error processing " + file.getName() + ": " + e.message);
      }
    }
  }
}

/**
 * HELPER: Performs OCR using Drive API
 */
function performOCR(file) {
  const resource = {
    title: 'Temp_OCR_' + file.getName(),
    mimeType: file.getMimeType()
  };
  
  // Requires Drive API Service to be enabled in Apps Script
  const ocrFile = Drive.Files.insert(resource, file.getBlob(), { ocr: true });
  const doc = DocumentApp.openById(ocrFile.id);
  const text = doc.getBody().getText();
  
  Drive.Files.remove(ocrFile.id); // Delete temp doc
  return text;
}

/**
 * HELPER: Regex patterns to find data in Indian receipts
 */
function extractDetails(text) {
  const cleanText = text.replace(/\n/g, " "); // Flatten text for easier matching
  
  return {
    amount: cleanText.match(/(?:RS|INR|₹)\s?([\d,.]+)/i)?.[1] || "",
    date: cleanText.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/)?.[0] || new Date().toLocaleDateString(),
    mobile: cleanText.match(/[6-9]\d{9}/)?.[0] || ""
  };
}

