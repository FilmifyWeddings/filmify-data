// Google Apps Script API for Filmify Studio
// 1. Create a Google Sheet with headers: ID, Name, Date, Type, Storage, Secure, Links
// 2. Open Extensions > Apps Script and paste this code.
// 3. Deploy as Web App (Execute as: Me, Access: Anyone).

// --- CONFIGURATION ---
const getTeamSpreadsheetId = () => PropertiesService.getScriptProperties().getProperty('TEAM_SPREADSHEET_ID') || "";

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

function logAction(action, details) {
  const logSheet = getOrCreateSheet("Logs", ["Timestamp", "Action", "Details", "User"]);
  logSheet.appendRow([
    new Date(),
    action,
    details,
    Session.getActiveUser().getEmail() || "Anonymous"
  ]);
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = getOrCreateSheet("Clients", ["ID", "Name", "Date", "Type", "Storage", "Secure", "Links"]);
  const binSheet = getOrCreateSheet("Bin", ["ID", "Name", "Date", "Type", "Storage", "Secure", "Links", "DeletedAt"]);
  const logSheet = getOrCreateSheet("Logs", ["Timestamp", "Action", "Details", "User"]);

  const getSheetData = (sheet) => {
    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift();
    return rows.map(row => {
      let obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      if (obj.Name !== undefined) obj.Name = String(obj.Name);
      if (obj.Links) {
        try { obj.Links = JSON.parse(obj.Links); } 
        catch (e) { obj.Links = { cloud: [], photos: [], videos: [] }; }
      }
      return obj;
    });
  };

  const clients = getSheetData(mainSheet);
  const bin = getSheetData(binSheet);
  const logs = logSheet.getDataRange().getValues().slice(1).reverse().slice(0, 100); // Last 100 logs

  // Fetch Team Management Data
  let teamProjects = [];
  let teamError = null;
  const teamId = getTeamSpreadsheetId();
  
  try {
    if (teamId && teamId.length > 10) {
      teamProjects = getTeamData(teamId);
    } else {
      teamError = "Team Spreadsheet ID is not configured.";
    }
  } catch (e) {
    teamError = "Error: " + e.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    clients: clients,
    bin: bin,
    logs: logs,
    teamProjects: teamProjects,
    teamError: teamError,
    config: { teamSpreadsheetId: teamId }
  })).setMimeType(ContentService.MimeType.JSON);
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

    const preWeddingEvents = projectAssignments.filter(a => a.SubEvent && a.SubEvent.toLowerCase().includes("pre-wedding"));
    const weddingEvents = projectAssignments.filter(a => a.SubEvent && (a.SubEvent.toLowerCase().includes("wedding") || a.SubEvent.toLowerCase().includes("nikah")) && !a.SubEvent.toLowerCase().includes("pre"));
    const otherEvents = projectAssignments.filter(a => a.SubEvent && !a.SubEvent.toLowerCase().includes("wedding") && !a.SubEvent.toLowerCase().includes("nikah") && !a.SubEvent.toLowerCase().includes("pre-wedding"));

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

    if (weddingEvents.length > 0) {
      const mainTeam = [...weddingEvents, ...otherEvents].map(a => ({ name: a.Person, role: a.Role })).filter(t => t.name);
      finalCards.push({
        ProjectID: pid + "_Wedding",
        ClientName: project.ClientName,
        Date: formatDate(weddingEvents[0].Date),
        Location: weddingEvents[0].Location,
        Type: weddingEvents[0].SubEvent,
        Team: mainTeam
      });
    } else if (otherEvents.length > 0) {
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
  if (date instanceof Date) return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(date);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = getOrCreateSheet("Clients", ["ID", "Name", "Date", "Type", "Storage", "Secure", "Links"]);
  const binSheet = getOrCreateSheet("Bin", ["ID", "Name", "Date", "Type", "Storage", "Secure", "Links", "DeletedAt"]);
  const action = params.action;
  
  if (action === "update_config") {
    if (params.teamSpreadsheetId) {
      PropertiesService.getScriptProperties().setProperty('TEAM_SPREADSHEET_ID', params.teamSpreadsheetId);
      logAction("CONFIG_UPDATE", "Updated Team Spreadsheet ID");
    }
    return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
  } 
  
  if (action === "add") {
    mainSheet.appendRow([
      params.id, params.name, params.date, params.type, params.storage, params.secure, 
      JSON.stringify(params.links || { cloud: [], photos: [], videos: [] })
    ]);
    logAction("ADD", `Added project: ${params.name} (${params.id})`);
  } 
  else if (action === "update") {
    const rows = mainSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == params.id) {
        mainSheet.getRange(i + 1, 1, 1, 7).setValues([[
          params.id, params.name, params.date, params.type, params.storage, params.secure, JSON.stringify(params.links)
        ]]);
        logAction("UPDATE", `Updated project: ${params.name} (${params.id})`);
        break;
      }
    }
  } 
  else if (action === "delete") {
    const rows = mainSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == params.id) {
        const rowData = rows[i];
        binSheet.appendRow([...rowData, new Date()]);
        mainSheet.deleteRow(i + 1);
        logAction("DELETE", `Moved to Bin: ${params.name} (${params.id})`);
        break;
      }
    }
  }
  else if (action === "restore") {
    const rows = binSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == params.id) {
        const rowData = rows[i].slice(0, 7);
        mainSheet.appendRow(rowData);
        binSheet.deleteRow(i + 1);
        logAction("RESTORE", `Restored from Bin: ${params.id}`);
        break;
      }
    }
  }
  else if (action === "permanent_delete") {
    const rows = binSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == params.id) {
        binSheet.deleteRow(i + 1);
        logAction("PERMANENT_DELETE", `Permanently deleted: ${params.id}`);
        break;
      }
    }
  }
  else if (action === "sync_team") {
    const project = params.project;
    mainSheet.appendRow([
      project.ProjectID, project.ClientName, project.Date, project.Type || "Wedding", 
      params.storage || "HDD 01", false, JSON.stringify({ cloud: [], photos: [], videos: [] })
    ]);
    logAction("SYNC_TEAM", `Synced team project: ${project.ClientName}`);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
}
