// Google Apps Script API for Filmify Studio
// 1. Create a Google Sheet with headers: ID, Name, Date, Type, Storage, Secure, Links
// 2. Open Extensions > Apps Script and paste this code.
// 3. Deploy as Web App (Execute as: Me, Access: Anyone).

// --- CONFIGURATION ---
// We use PropertiesService so the ID can be updated from the web app UI
const getTeamSpreadsheetId = () => PropertiesService.getScriptProperties().getProperty('TEAM_SPREADSHEET_ID') || "";

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  
  const clients = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    if (obj.Links) {
      try {
        obj.Links = JSON.parse(obj.Links);
      } catch (e) {
        obj.Links = { cloud: [], photos: [], videos: [] };
      }
    }
    return obj;
  });

  // Fetch Team Management Data
  let teamProjects = [];
  let teamError = null;
  const teamId = getTeamSpreadsheetId();
  
  try {
    if (teamId && teamId.length > 10) {
      teamProjects = getTeamData(teamId);
      
      // Automatic Sync: Check for new projects in Team that aren't in Filmify
      const existingIds = clients.map(c => String(c.ID));
      teamProjects.forEach(p => {
        if (!existingIds.includes(String(p.ProjectID))) {
          sheet.appendRow([
            p.ProjectID,
            p.ClientName,
            p.Date,
            "Wedding", // Default type
            "HDD 01", // Default storage
            false,
            JSON.stringify({ cloud: [], photos: [], videos: [] })
          ]);
          // Add to local clients array so it shows up immediately
          clients.push({
            ID: p.ProjectID,
            Name: p.ClientName,
            Date: p.Date,
            Type: "Wedding",
            Storage: "HDD 01",
            Secure: false,
            Links: { cloud: [], photos: [], videos: [] }
          });
        }
      });
    } else {
      teamError = "Team Spreadsheet ID is not configured. Please set it in Settings.";
    }
  } catch (e) {
    teamError = "Error: " + e.toString();
    console.error("Error fetching/syncing team data:", e);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    clients: clients,
    teamProjects: teamProjects,
    teamError: teamError,
    config: {
      teamSpreadsheetId: teamId
    }
  }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTeamData(id) {
  const teamSS = SpreadsheetApp.openById(id);
  const sheets = teamSS.getSheets();
  
  // Try to find sheets by name or fallback to first/second sheet
  const projectSheet = teamSS.getSheetByName("Projects") || sheets.find(s => s.getName().toLowerCase().includes("project")) || sheets[0];
  const assignmentSheet = teamSS.getSheetByName("Assignments") || sheets.find(s => s.getName().toLowerCase().includes("assign")) || sheets[1];
  
  if (!projectSheet) return [];
  
  const projectRows = projectSheet.getDataRange().getValues();
  const projectHeaders = projectRows.shift();
  
  const assignments = assignmentSheet ? assignmentSheet.getDataRange().getValues() : [];
  if (assignments.length > 0) assignments.shift(); // remove headers
  
  return projectRows.map(row => {
    let p = {};
    projectHeaders.forEach((h, i) => {
      const header = String(h).toLowerCase();
      if (header.includes("client") || header.includes("name")) p.ClientName = row[i];
      if (header.includes("id")) p.ProjectID = row[i];
      if (header.includes("date")) p.Date = row[i];
      if (header.includes("location")) p.Location = row[i];
    });
    
    // Fallback if headers didn't match
    if (!p.ProjectID) p.ProjectID = row[0];
    if (!p.ClientName) p.ClientName = row[1];
    if (!p.Date) p.Date = row[2];
    
    // Add assignments for this project
    p.Team = assignments
      .filter(a => String(a[0]) == String(p.ProjectID))
      .map(a => ({ name: a[1], role: a[2] }));
      
    return p;
  });
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const action = params.action;
  
  if (action === "update_config") {
    if (params.teamSpreadsheetId) {
      PropertiesService.getScriptProperties().setProperty('TEAM_SPREADSHEET_ID', params.teamSpreadsheetId);
    }
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === "add") {
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
    const rows = sheet.getDataRange().getValues();
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
  } else if (action === "sync_team") {
    // Logic to manually sync a project from Team to Filmify
    const project = params.project;
    sheet.appendRow([
      project.ProjectID,
      project.ClientName,
      project.Date,
      "Wedding", // Default type
      "HDD 01", // Default storage
      false,
      JSON.stringify({ cloud: [], photos: [], videos: [] })
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}
