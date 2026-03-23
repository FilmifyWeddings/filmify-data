// Google Apps Script API for Filmify Studio
// 1. Create a Google Sheet with headers: ID, Name, Date, Type, Storage, Secure, Links
// 2. Open Extensions > Apps Script and paste this code.
// 3. Deploy as Web App (Execute as: Me, Access: Anyone).

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  
  const data = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    // Parse JSON string back to object for Links
    if (obj.Links) {
      try {
        obj.Links = JSON.parse(obj.Links);
      } catch (e) {
        obj.Links = { cloud: [], photos: [], videos: [] };
      }
    }
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const action = params.action;
  
  if (action === "add") {
    sheet.appendRow([
      params.id, 
      params.name, 
      params.date, 
      params.type, 
      params.storage, 
      params.secure, 
      JSON.stringify(params.links || { cloud: [], photos: [], videos: [] })
    ]);
  } else if (action === "update" || action === "delete") {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == params.id) {
        if (action === "update") {
          sheet.getRange(i + 1, 1, 1, 7).setValues([[
            params.id, 
            params.name, 
            params.date, 
            params.type, 
            params.storage, 
            params.secure, 
            JSON.stringify(params.links)
          ]]);
        } else {
          sheet.deleteRow(i + 1);
        }
        break;
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}
