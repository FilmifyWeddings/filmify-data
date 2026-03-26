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
    
    // Ensure Name is a string
    if (obj.Name !== undefined && obj.Name !== null) {
      obj.Name = String(obj.Name);
    }
    
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
      // We use the unique ID (ProjectID + SubEvent)
      const existingIds = clients.map(c => String(c.ID));
      teamProjects.forEach(p => {
        if (!existingIds.includes(String(p.ProjectID))) {
          // We don't auto-sync everything anymore to avoid clutter, 
          // but we keep the teamProjects array for the "Team" tab.
          // The user can manually sync from the "Team" tab.
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
  
  const projectSheet = teamSS.getSheetByName("Projects") || sheets.find(s => s.getName().toLowerCase().includes("project")) || sheets[0];
  const assignmentSheet = teamSS.getSheetByName("Assignments") || sheets.find(s => s.getName().toLowerCase().includes("assign")) || sheets[1];
  
  if (!projectSheet) return [];
  
  const projectRows = projectSheet.getDataRange().getValues();
  const projectHeaders = projectRows.shift();
  
  const assignmentsRows = assignmentSheet ? assignmentSheet.getDataRange().getValues() : [];
  const assignmentHeaders = assignmentsRows.length > 0 ? assignmentsRows.shift() : [];
  
  // Map projects for easy lookup
  const projectsMap = {};
  projectRows.forEach(row => {
    let p = {};
    projectHeaders.forEach((h, i) => {
      const header = String(h).toLowerCase();
      if (header.includes("client") || header.includes("name")) p.ClientName = String(row[i] || "");
      if (header.includes("projectid")) p.ProjectID = String(row[i] || "");
    });
    if (p.ProjectID) projectsMap[p.ProjectID] = p;
  });

  // Process Assignments into cards
  const groupedAssignments = {};
  assignmentsRows.forEach(row => {
    let a = {};
    assignmentHeaders.forEach((h, i) => {
      const header = String(h).toLowerCase();
      if (header.includes("projectid")) a.ProjectID = String(row[i] || "");
      if (header.includes("subevent") && !header.includes("date") && !header.includes("location") && !header.includes("note")) a.SubEvent = String(row[i] || "");
      if (header.includes("subeventdate")) a.Date = row[i];
      if (header.includes("subeventlocation")) a.Location = row[i];
      if (header.includes("assignedperson")) a.Person = String(row[i] || "");
      if (header.includes("requiredrole")) a.Role = String(row[i] || "");
    });

    if (!a.ProjectID) return;
    if (!groupedAssignments[a.ProjectID]) groupedAssignments[a.ProjectID] = [];
    groupedAssignments[a.ProjectID].push(a);
  });

  const finalCards = [];

  Object.keys(groupedAssignments).forEach(pid => {
    const project = projectsMap[pid] || { ClientName: "Unknown Client", ProjectID: pid };
    const projectAssignments = groupedAssignments[pid];

    // Separate by types
    const preWeddingEvents = projectAssignments.filter(a => a.SubEvent && a.SubEvent.toLowerCase().includes("pre-wedding"));
    const weddingEvents = projectAssignments.filter(a => a.SubEvent && (a.SubEvent.toLowerCase().includes("wedding") || a.SubEvent.toLowerCase().includes("nikah")) && !a.SubEvent.toLowerCase().includes("pre"));
    const otherEvents = projectAssignments.filter(a => a.SubEvent && !a.SubEvent.toLowerCase().includes("wedding") && !a.SubEvent.toLowerCase().includes("nikah") && !a.SubEvent.toLowerCase().includes("pre-wedding"));

    // 1. Pre-wedding Card (Always separate if exists)
    if (preWeddingEvents.length > 0) {
      finalCards.push({
        ProjectID: pid + "_PreWedding",
        ClientName: project.ClientName,
        Date: formatDate(preWeddingEvents[0].Date),
        Location: preWeddingEvents[0].Location,
        Type: "Pre-wedding",
        Team: preWeddingEvents.map(a => ({ name: a.Person, role: a.Role })).filter(t => t.name)
      });
    }

    // 2. Wedding Card (Main Event)
    if (weddingEvents.length > 0) {
      // If Wedding or Nikah exists, Haldi/Sangeet (others) are grouped into it
      const mainTeam = [...weddingEvents, ...otherEvents].map(a => ({ name: a.Person, role: a.Role })).filter(t => t.name);
      finalCards.push({
        ProjectID: pid + "_Wedding",
        ClientName: project.ClientName,
        Date: formatDate(weddingEvents[0].Date),
        Location: weddingEvents[0].Location,
        Type: weddingEvents[0].SubEvent, // Keep original name (e.g. Nikah)
        Team: mainTeam
      });
    } 
    // 3. Other Events (Only if no Wedding exists)
    else if (otherEvents.length > 0) {
      // Group others by SubEvent type
      const subEventGroups = {};
      otherEvents.forEach(a => {
        if (!subEventGroups[a.SubEvent]) subEventGroups[a.SubEvent] = [];
        subEventGroups[a.SubEvent].push(a);
      });

      Object.keys(subEventGroups).forEach(subType => {
        const events = subEventGroups[subType];
        finalCards.push({
          ProjectID: pid + "_" + subType.replace(/\s+/g, ''),
          ClientName: project.ClientName,
          Date: formatDate(events[0].Date),
          Location: events[0].Location,
          Type: subType,
          Team: events.map(a => ({ name: a.Person, role: a.Role })).filter(t => t.name)
        });
      });
    }
  });

  return finalCards;
}

function formatDate(date) {
  if (!date) return "";
  if (date instanceof Date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(date);
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
      project.Type || "Wedding", 
      "HDD 01", // Default storage
      false,
      JSON.stringify({ cloud: [], photos: [], videos: [] })
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}
