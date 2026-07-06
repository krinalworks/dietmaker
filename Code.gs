/**
 * Mobile Diet Plan PDF Generator — backend.
 *
 * PDFs are built directly with DocumentApp (no template doc / placeholder
 * replacement). This avoids Google Docs' known issue where {{PLACEHOLDER}}
 * text silently fails to match if it gets split across text styles.
 */

const CONFIG = {
  // Paste a Google Drive folder ID here to save PDFs into that folder.
  // Leave blank to save PDFs in the root of Drive.
  OUTPUT_FOLDER_ID: '',
  // Leave blank if this script is bound to a Google Sheet (recommended).
  // Paste a Spreadsheet ID here only if running as a standalone script.
  SPREADSHEET_ID: '',
  TIMEZONE: 'Asia/Kolkata',
  DATE_FORMAT: 'dd MMM yyyy',
  // Shown as the title on every generated PDF. Edit to your clinic/brand name.
  CLINIC_NAME: 'Diet Plan',
  APP_TITLE: 'Diet Plan Generator'
};

const SHEET_CLIENTS = 'Clients';
const SHEET_PLANS = 'DietPlans';
const SHEET_FOOD = 'FoodLibrary';

const CLIENTS_HEADERS = ['ClientID', 'Name', 'Age', 'Phone', 'Notes', 'CreatedAt', 'UpdatedAt'];
const PLANS_HEADERS = [
  'PlanID', 'ClientID', 'ClientName', 'Age', 'Phone', 'WeekNo', 'StartDate', 'EndDate',
  'Day1Lunch', 'Day1Dinner', 'Day2Lunch', 'Day2Dinner', 'Day3Lunch', 'Day3Dinner',
  'Day4Lunch', 'Day4Dinner', 'Day5Lunch', 'Day5Dinner', 'Day6Lunch', 'Day6Dinner',
  'Day7Lunch', 'Day7Dinner', 'GeneralNotes', 'PdfFileId', 'PdfUrl', 'CreatedAt'
];
const FOOD_HEADERS = ['Category', 'Item', 'Notes'];

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

// ---------------------------------------------------------------------------
// Web app entry point
// ---------------------------------------------------------------------------

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------------------------------------------------------------------------
// Database setup — safe to run multiple times, never erases existing data.
// ---------------------------------------------------------------------------

function initializeDatabase() {
  const ss = getSpreadsheet_();
  getOrCreateSheet_(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
  getOrCreateSheet_(ss, SHEET_PLANS, PLANS_HEADERS);
  getOrCreateSheet_(ss, SHEET_FOOD, FOOD_HEADERS);
  return 'Database initialized.';
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('No spreadsheet found. Set CONFIG.SPREADSHEET_ID in Code.gs, or bind this script to a Google Sheet.');
  }
  return active;
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some(function (cell) { return cell !== ''; });
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { header: values[0] || [], rows: [] };
  return { header: values[0], rows: values.slice(1) };
}

// ---------------------------------------------------------------------------
// Frontend data loading
// ---------------------------------------------------------------------------

function getInitialData() {
  const ss = getSpreadsheet_();
  const clientsSheet = getOrCreateSheet_(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
  const foodSheet = getOrCreateSheet_(ss, SHEET_FOOD, FOOD_HEADERS);

  const clients = [];
  const clientData = getRows_(clientsSheet);
  const cIdIdx = clientData.header.indexOf('ClientID');
  const cNameIdx = clientData.header.indexOf('Name');
  const cAgeIdx = clientData.header.indexOf('Age');
  const cPhoneIdx = clientData.header.indexOf('Phone');
  const cNotesIdx = clientData.header.indexOf('Notes');
  clientData.rows.forEach(function (row) {
    if (!row[cIdIdx]) return;
    clients.push({
      id: String(row[cIdIdx]),
      name: String(row[cNameIdx] || ''),
      age: row[cAgeIdx] === '' ? '' : String(row[cAgeIdx]),
      phone: String(row[cPhoneIdx] || ''),
      notes: String(row[cNotesIdx] || '')
    });
  });

  const foodLibrary = [];
  const foodData = getRows_(foodSheet);
  const fCatIdx = foodData.header.indexOf('Category');
  const fItemIdx = foodData.header.indexOf('Item');
  const fNotesIdx = foodData.header.indexOf('Notes');
  foodData.rows.forEach(function (row) {
    if (!row[fItemIdx]) return;
    foodLibrary.push({
      category: String(row[fCatIdx] || ''),
      item: String(row[fItemIdx] || ''),
      notes: String(row[fNotesIdx] || '')
    });
  });

  return { clients: clients, foodLibrary: foodLibrary };
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

function addClient(client) {
  client = client || {};
  const name = String(client.name || '').trim();
  if (!name) {
    throw new Error('Client name is required.');
  }
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
  const id = Utilities.getUuid();
  const now = nowString_();
  const age = String(client.age || '');
  const phone = String(client.phone || '');
  const notes = String(client.notes || '');
  sheet.appendRow([id, name, age, phone, notes, now, now]);
  return { id: id, name: name, age: age, phone: phone, notes: notes };
}

function findOrCreateClient_(payload) {
  const clientId = String(payload.clientId || '').trim();
  if (clientId) {
    const ss = getSpreadsheet_();
    const sheet = getOrCreateSheet_(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
    const data = getRows_(sheet);
    const h = data.header;
    const idIdx = h.indexOf('ClientID');
    const nameIdx = h.indexOf('Name');
    const ageIdx = h.indexOf('Age');
    const phoneIdx = h.indexOf('Phone');
    const notesIdx = h.indexOf('Notes');
    for (let i = 0; i < data.rows.length; i++) {
      if (String(data.rows[i][idIdx]) === clientId) {
        return {
          id: clientId,
          name: String(data.rows[i][nameIdx] || ''),
          age: String(data.rows[i][ageIdx] || ''),
          phone: String(data.rows[i][phoneIdx] || ''),
          notes: String(data.rows[i][notesIdx] || '')
        };
      }
    }
    throw new Error('Selected client was not found. Please refresh and try again.');
  }

  const newName = String(payload.newClientName || '').trim();
  if (!newName) {
    throw new Error('Select a client or add a new client.');
  }
  return addClient({
    name: newName,
    age: payload.newClientAge,
    phone: payload.newClientPhone,
    notes: payload.newClientNotes
  });
}

// ---------------------------------------------------------------------------
// Diet plan + PDF generation
// ---------------------------------------------------------------------------

function validatePlanPayload_(payload) {
  if (!payload) throw new Error('Missing plan details.');
  const hasClientId = payload.clientId && String(payload.clientId).trim();
  const hasNewName = payload.newClientName && String(payload.newClientName).trim();
  if (!hasClientId && !hasNewName) {
    throw new Error('Select a client or add a new client.');
  }
  if (!payload.weekNo || !String(payload.weekNo).trim()) {
    throw new Error('Week number is required.');
  }
  if (!payload.startDate) {
    throw new Error('Start date is required.');
  }
  if (!payload.endDate) {
    throw new Error('End date is required.');
  }
  const days = payload.days || [];
  const hasMeal = days.some(function (d) {
    return d && ((d.lunch && String(d.lunch).trim()) || (d.dinner && String(d.dinner).trim()));
  });
  if (!hasMeal) {
    throw new Error('Add at least one lunch or dinner entry.');
  }
}

function normalizeDays_(days) {
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = (days && days[i]) || {};
    result.push({
      lunch: String(d.lunch || '').trim(),
      dinner: String(d.dinner || '').trim()
    });
  }
  return result;
}

function savePlanAndGeneratePdf(payload) {
  try {
    validatePlanPayload_(payload);
    const client = findOrCreateClient_(payload);
    const days = normalizeDays_(payload.days);
    const plan = {
      planId: Utilities.getUuid(),
      weekNo: String(payload.weekNo).trim(),
      startDate: String(payload.startDate).trim(),
      endDate: String(payload.endDate).trim(),
      generalNotes: String(payload.generalNotes || '').trim()
    };

    const pdf = createPdfFromScratch_(client, plan, days);
    savePlanRow_(client, plan, days, pdf);

    return {
      ok: true,
      pdfUrl: pdf.url,
      pdfFileId: pdf.id,
      fileName: pdf.fileName,
      client: { id: client.id, name: client.name },
      planId: plan.planId
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function savePlanRow_(client, plan, days, pdf) {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, SHEET_PLANS, PLANS_HEADERS);
  const row = [plan.planId, client.id, client.name, client.age || '', client.phone || '', plan.weekNo, plan.startDate, plan.endDate];
  days.forEach(function (d) { row.push(d.lunch, d.dinner); });
  row.push(plan.generalNotes, pdf.id, pdf.url, nowString_());
  sheet.appendRow(row);
}

function getRecentPlans(clientId) {
  clientId = String(clientId || '').trim();
  if (!clientId) return [];
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEET_PLANS);
  if (!sheet) return [];
  const data = getRows_(sheet);
  const h = data.header;
  const idIdx = h.indexOf('ClientID');
  const planIdx = h.indexOf('PlanID');
  const weekIdx = h.indexOf('WeekNo');
  const startIdx = h.indexOf('StartDate');
  const endIdx = h.indexOf('EndDate');
  const urlIdx = h.indexOf('PdfUrl');
  const createdIdx = h.indexOf('CreatedAt');

  const plans = data.rows
    .filter(function (row) { return String(row[idIdx]) === clientId; })
    .map(function (row) {
      return {
        planId: String(row[planIdx]),
        weekNo: String(row[weekIdx]),
        startDate: String(row[startIdx]),
        endDate: String(row[endIdx]),
        pdfUrl: String(row[urlIdx]),
        createdAt: String(row[createdIdx])
      };
    });

  plans.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return plans.slice(0, 10);
}

/**
 * Builds the diet plan PDF directly with DocumentApp (no template doc,
 * no text placeholders to match) so formatting can never silently break.
 */
function createPdfFromScratch_(client, plan, days) {
  const displayStart = formatDateForDisplay_(plan.startDate);
  const displayEnd = formatDateForDisplay_(plan.endDate);
  const fileName = sanitizeFileName_(
    (client.name || 'Client') + ' - Week ' + plan.weekNo + ' Diet Plan - ' + displayStart + ' to ' + displayEnd
  ) + '.pdf';

  const doc = DocumentApp.create(fileName);
  const body = doc.getBody();
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(48).setMarginRight(48);

  const title = body.appendParagraph(CONFIG.CLINIC_NAME);
  title.setHeading(DocumentApp.ParagraphHeading.TITLE);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const subtitle = body.appendParagraph('Weekly Diet Plan');
  subtitle.setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  subtitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendParagraph('');

  const infoTable = body.appendTable([
    ['Name', client.name || '-'],
    ['Age', client.age ? String(client.age) : '-'],
    ['Week', String(plan.weekNo)],
    ['Duration', displayStart + ' to ' + displayEnd]
  ]);
  styleInfoTable_(infoTable);

  body.appendParagraph('');

  const mealRows = [['Day', 'Lunch', 'Dinner']];
  days.forEach(function (d, i) {
    mealRows.push([DAY_LABELS[i], d.lunch || '-', d.dinner || '-']);
  });
  const mealsTable = body.appendTable(mealRows);
  styleMealsTable_(mealsTable);

  if (plan.generalNotes) {
    body.appendParagraph('');
    const notesHeading = body.appendParagraph('Notes');
    notesHeading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(plan.generalNotes);
  }

  body.appendParagraph('');
  const footer = body.appendParagraph('Generated on ' + formatDateForDisplay_(todayIso_()));
  footer.setFontSize(9);
  footer.setForegroundColor('#888888');

  doc.saveAndClose();

  let pdfFile;
  try {
    const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
    pdfBlob.setName(fileName);
    const folder = CONFIG.OUTPUT_FOLDER_ID ? DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID) : DriveApp.getRootFolder();
    pdfFile = folder.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    throw new Error('Could not save the PDF to Drive. Check CONFIG.OUTPUT_FOLDER_ID and Drive permissions. (' + err.message + ')');
  } finally {
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  }

  return { id: pdfFile.getId(), url: pdfFile.getUrl(), fileName: fileName };
}

function styleInfoTable_(table) {
  for (let i = 0; i < table.getNumRows(); i++) {
    const labelCell = table.getRow(i).getCell(0);
    labelCell.setBackgroundColor('#f2f2f2');
    labelCell.getChild(0).asParagraph().editAsText().setBold(true);
  }
}

function styleMealsTable_(table) {
  const headerRow = table.getRow(0);
  for (let c = 0; c < headerRow.getNumCells(); c++) {
    const cell = headerRow.getCell(c);
    cell.setBackgroundColor('#4a6fa5');
    const text = cell.getChild(0).asParagraph().editAsText();
    text.setBold(true);
    text.setForegroundColor('#ffffff');
  }
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function nowString_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function todayIso_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function formatDateForDisplay_(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return String(dateStr);
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Utilities.formatDate(date, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
}

function sanitizeFileName_(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}
