/**
 * DONATION RECEIPT SCANNER (Mobile Optimized)
 * -----------------------------------------
 * 1. Upload receipt photo to 'Source' folder via Drive App.
 * 2. Script performs OCR and extracts Date, Amount, and Mobile.
 * 3. Script updates Google Sheet and moves file to 'Processed'.
 */

// === CONFIGURATION ===
const CONFIG = {
  SOURCE_FOLDER_ID: '1pqvAcu3iCpBfvMuM4nSC3qN22uKnts0i',
  PROCESSED_FOLDER_ID: '1g5pI0KLQ8JMtDDdpA66b9YpOFXIBE-IZ',
  SHEET_NAME: 'Sheet1'
};

/**
 * Main Runner: Select this in the toolbar and click 'Run'
 */
function processDonationReceipts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const srcFolder = DriveApp.getFolderById(CONFIG.SOURCE_FOLDER_ID);
  const destFolder = DriveApp.getFolderById(CONFIG.PROCESSED_FOLDER_ID);
  
  const files = srcFolder.getFiles();
  let count = 0;

  while (files.hasNext()) {
    const file = files.next();
    
    // Only process images (JPG, PNG, etc.)
    if (file.getMimeType().startsWith('image/')) {
      try {
        console.log(`Processing file: ${file.getName()}`);
        
        // 1. Run OCR
        const fullText = performOCR(file);
        
        // 2. Extract Data
        const extracted = extractReceiptData(fullText);
        
        // 3. Append to Sheet (Columns A to J)
        // [Raw Text, Receipt No, Date, Name, Address, Mobile, Amount, Amount Words, Mode, Purpose]
        sheet.appendRow([
          fullText.substring(0, 1500), // A: Raw Text for reference
          "",                          // B: Receipt No (Manual/Auto)
          extracted.date,              // C: Date
          "",                          // D: Name
          "",                          // E: Address
          extracted.mobile,            // F: Mobile No
          extracted.amount,            // G: Amount
          "",                          // H: Amount in Words
          "",                          // I: Payment Mode
          "Donation"                   // J: Purpose
        ]);
        
        // 4. Move file to avoid double-processing
        destFolder.addFile(file);
        srcFolder.removeFile(file);
        
        count++;
      } catch (err) {
        console.error(`Error with ${file.getName()}: ${err.message}`);
      }
    }
  }
  
  console.log(`Job complete. Processed ${count} receipts.`);
}

/**
 * Helper: Uses Google Drive API to convert Image -> Text
 */
function performOCR(file) {
  const resource = {
    title: 'temp_ocr_' + file.getName(),
    mimeType: file.getMimeType()
  };
  
  // OCR conversion via Drive Advanced Service
  const ocrFile = Drive.Files.insert(resource, file.getBlob(), { ocr: true });
  const doc = DocumentApp.openById(ocrFile.id);
  const text = doc.getBody().getText();
  
  // Clean up the temporary Doc
  Drive.Files.remove(ocrFile.id);
  
  return text;
}

/**
 * Helper: Logic to find specific patterns in the text
 */
function extractReceiptData(text) {
  // Flatten text to a single line for easier regex matching
  const flatText = text.replace(/\n/g, " ");
  
  return {
    // Looks for ₹, RS, or INR followed by digits/decimals
    amount: flatText.match(/(?:RS|INR|₹|TOTAL|AMT)\s?([\d,.]+)/i)?.[1] || "",
    
    // Looks for common date formats (DD/MM/YYYY or DD-MM-YY)
    date: flatText.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/)?.[0] || new Date().toLocaleDateString('en-IN'),
    
    // Looks for 10-digit Indian mobile numbers
    mobile: flatText.match(/[6-9]\d{9}/)?.[0] || ""
  };
}
