/**
 * Mobile Diet Plan PDF Generator — backend.
 *
 * PDF layout matches the dietician's existing branded diet plan format:
 * cover page, common daily plan, lunch table, dinner table, diet
 * guidelines, weekly progress tracker, coach contact page.
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
  APP_TITLE: 'Diet Plan Generator',

  // --- Branding shown on the cover page of every PDF ---
  DOC_TITLE: 'CUSTOMIZED DIET PLAN',
  DOC_TAGLINE: 'Weight Management & Fat Loss Diet Plan',
  DEFAULT_HIGHLIGHT: '45 Minutes Fast Walk is Compulsion Every Day',

  // --- Fixed labels for the lunch/dinner pages ---
  LUNCH_TIME_LABEL: '1:00 PM – 2:00 PM',
  DINNER_TIME_LABEL: '7:00 PM',

  // --- Static notes reused on every PDF ---
  HYDRATION_NOTE: 'Drink 3 Litres of water every day. Prefer warm or room temperature water with meals. Avoid cold drinks and packaged juices entirely.',
  DINNER_NOTE: 'Always eat dinner before 8:00 PM. Dinner is kept light to support overnight fat metabolism.',
  MOTIVATIONAL_QUOTE: 'When you want to give up, remember why you started.',

  // --- Coach bio / contact, shown on the last page of every PDF ---
  DIETICIAN_NAME: 'Foram Patel',
  CREDENTIALS: 'Certified Nutritionist & Dietician',
  PHONE: '09724617765',
  EMAIL: 'Foram2206@gmail.com',
  INSTAGRAM_HANDLE: '', // leave blank to omit from the PDF
  WEBSITE: '', // leave blank to omit from the PDF
  REFERRAL_TEXT: 'Share this plan with a friend. They receive 10% off their first plan. You receive 1 free follow-up session.',
  OTHER_PROGRAMS: [] // e.g. ['12-Week Transformation Program', 'Postpartum Nutrition Program']
};

// Static Diet Guidelines content — edit here if it ever needs to change;
// it is the same for every client/plan, so it's not part of the form.
const DOS_LIST = [
  'Eat every 2.5 – 3 hours',
  'Chew each bite slowly (20+ times)',
  'Drink water 30 minutes before meals',
  'Walk 45 minutes every single day',
  'Sleep 7 – 8 hours each night',
  'Use rock salt instead of regular salt',
  'Eat dinner before 8:00 PM',
  'Keep phone away while eating'
];
const DONTS_LIST = [
  'Skip any meal',
  'Eat fried or processed food',
  'Consume refined sugar or maida',
  'Drink cold water with meals',
  'Eat after 8:00 PM',
  'Drink packaged juices or cold drinks',
  'Stay inactive for more than 2 hours',
  'Sleep immediately after eating'
];
const LIFESTYLE_TIPS = [
  ['Morning Ritual', 'Start your day with warm Methi water. Do light stretching for 5 minutes before your walk. Walk in natural morning sunlight for best results.'],
  ['Sleep & Recovery', 'Sleep by 10:30 PM. Avoid screens at least 1 hour before bed. No heavy meals after 7:00 PM. Quality sleep directly supports fat loss.'],
  ['Eating Mindfully', 'Always sit and eat. No television or phone during meals. Chew slowly. Stop eating when you feel 80% full — not completely stuffed.'],
  ['Stress Management', 'High stress raises cortisol which blocks fat loss. Practice 10 minutes of deep breathing or light meditation daily after your walk.']
];

// PDF color palette
const DARK_GREEN = '#1d3c2b';
const GOLD = '#c99a3c';
const GOLD_TEXT = '#e3b968';
const LIGHT_GREEN = '#eaf2ec';
const LIGHT_GOLD = '#faf1de';
const TEXT_MUTED = '#6b7280';

const SHEET_CLIENTS = 'Clients';
const SHEET_PLANS = 'DietPlans';
const SHEET_FOOD = 'FoodLibrary';

// Client identity + notes, plus a "profile" (program info + common daily
// meals) that rarely changes week to week and is auto-filled from the last
// plan generated for that client.
const CLIENTS_HEADERS = [
  'ClientID', 'Name', 'Age', 'Phone', 'Notes',
  'Goal', 'DietType', 'ProgramStartDate', 'ProgramStartWeight',
  'OnRising', 'BeforeExercise', 'AfterExercise', 'Brunch', 'Snack', 'BedTime',
  'CreatedAt', 'UpdatedAt'
];

const PLANS_HEADERS = [
  'PlanID', 'ClientID', 'ClientName', 'Age', 'Phone',
  'Goal', 'DietType', 'ProgramStartDate', 'ProgramStartWeight',
  'WeekNo', 'StartDate', 'EndDate', 'HighlightNote',
  'OnRising', 'BeforeExercise', 'AfterExercise', 'Brunch', 'Snack', 'BedTime',
  'Day1Lunch', 'Day1Dinner', 'Day2Lunch', 'Day2Dinner', 'Day3Lunch', 'Day3Dinner',
  'Day4Lunch', 'Day4Dinner', 'Day5Lunch', 'Day5Dinner', 'Day6Lunch', 'Day6Dinner',
  'Day7Lunch', 'Day7Dinner',
  'GeneralNotes', 'PdfFileId', 'PdfUrl', 'CreatedAt'
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

/** Maps a plain object to a row array in the given sheet's header order. */
function rowFromHeaders_(headers, valuesObj) {
  return headers.map(function (h) {
    const v = valuesObj[h];
    return v === undefined || v === null ? '' : v;
  });
}

// ---------------------------------------------------------------------------
// Frontend data loading
// ---------------------------------------------------------------------------

function getInitialData() {
  const ss = getSpreadsheet_();
  const clientsSheet = getOrCreateSheet_(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
  const foodSheet = getOrCreateSheet_(ss, SHEET_FOOD, FOOD_HEADERS);

  const clientData = getRows_(clientsSheet);
  const h = clientData.header;
  const idx = {};
  CLIENTS_HEADERS.forEach(function (name) { idx[name] = h.indexOf(name); });

  const clients = clientData.rows
    .filter(function (row) { return row[idx.ClientID]; })
    .map(function (row) {
      return {
        id: String(row[idx.ClientID]),
        name: String(row[idx.Name] || ''),
        age: row[idx.Age] === '' ? '' : String(row[idx.Age]),
        phone: String(row[idx.Phone] || ''),
        notes: String(row[idx.Notes] || ''),
        goal: String(row[idx.Goal] || ''),
        dietType: String(row[idx.DietType] || ''),
        programStartDate: String(row[idx.ProgramStartDate] || ''),
        programStartWeight: String(row[idx.ProgramStartWeight] || ''),
        onRising: String(row[idx.OnRising] || ''),
        beforeExercise: String(row[idx.BeforeExercise] || ''),
        afterExercise: String(row[idx.AfterExercise] || ''),
        brunch: String(row[idx.Brunch] || ''),
        snack: String(row[idx.Snack] || ''),
        bedTime: String(row[idx.BedTime] || '')
      };
    });

  const foodData = getRows_(foodSheet);
  const fh = foodData.header;
  const fCatIdx = fh.indexOf('Category');
  const fItemIdx = fh.indexOf('Item');
  const fNotesIdx = fh.indexOf('Notes');
  const foodLibrary = foodData.rows
    .filter(function (row) { return row[fItemIdx]; })
    .map(function (row) {
      return { category: String(row[fCatIdx] || ''), item: String(row[fItemIdx] || ''), notes: String(row[fNotesIdx] || '') };
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

  // A brand new client starts with an empty profile; Goal/Diet Type/
  // Program Start Date & Weight/Common Daily Plan are filled in the first
  // time a plan is generated for them (see updateClientProfile_).
  sheet.appendRow(rowFromHeaders_(CLIENTS_HEADERS, {
    ClientID: id, Name: name, Age: age, Phone: phone, Notes: notes,
    CreatedAt: now, UpdatedAt: now
  }));

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

/**
 * Updates a client's stored profile (Goal, Diet Type, Program Start Date &
 * Weight, Common Daily Plan) with whatever was submitted this time, so the
 * next plan for this client starts prefilled. Never overwrites a stored
 * value with a blank one — leaving a field empty in the form just means
 * "no change", not "delete this".
 */
function updateClientProfile_(clientId, profile) {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, SHEET_CLIENTS, CLIENTS_HEADERS);
  const data = getRows_(sheet);
  const h = data.header;
  const idIdx = h.indexOf('ClientID');

  const fieldMap = {
    Goal: 'goal', DietType: 'dietType', ProgramStartDate: 'programStartDate', ProgramStartWeight: 'programStartWeight',
    OnRising: 'onRising', BeforeExercise: 'beforeExercise', AfterExercise: 'afterExercise',
    Brunch: 'brunch', Snack: 'snack', BedTime: 'bedTime'
  };

  for (let i = 0; i < data.rows.length; i++) {
    if (String(data.rows[i][idIdx]) !== clientId) continue;
    const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
    Object.keys(fieldMap).forEach(function (header) {
      const value = profile[fieldMap[header]];
      if (!value) return;
      const col = h.indexOf(header);
      if (col !== -1) sheet.getRange(rowNum, col + 1).setValue(value);
    });
    const updatedCol = h.indexOf('UpdatedAt');
    if (updatedCol !== -1) sheet.getRange(rowNum, updatedCol + 1).setValue(nowString_());
    return;
  }
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

function buildProfile_(payload) {
  return {
    goal: String(payload.goal || '').trim(),
    dietType: String(payload.dietType || '').trim(),
    programStartDate: String(payload.programStartDate || '').trim(),
    programStartWeight: String(payload.programStartWeight || '').trim(),
    onRising: String(payload.onRising || '').trim(),
    beforeExercise: String(payload.beforeExercise || '').trim(),
    afterExercise: String(payload.afterExercise || '').trim(),
    brunch: String(payload.brunch || '').trim(),
    snack: String(payload.snack || '').trim(),
    bedTime: String(payload.bedTime || '').trim()
  };
}

function savePlanAndGeneratePdf(payload) {
  try {
    validatePlanPayload_(payload);
    const client = findOrCreateClient_(payload);
    const profile = buildProfile_(payload);
    updateClientProfile_(client.id, profile);

    const days = normalizeDays_(payload.days);
    const plan = {
      planId: Utilities.getUuid(),
      weekNo: String(payload.weekNo).trim(),
      startDate: String(payload.startDate).trim(),
      endDate: String(payload.endDate).trim(),
      highlightNote: String(payload.highlightNote || '').trim(),
      generalNotes: String(payload.generalNotes || '').trim()
    };

    const pdf = createDietPlanPdf_(client, profile, plan, days);
    savePlanRow_(client, profile, plan, days, pdf);

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

function savePlanRow_(client, profile, plan, days, pdf) {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, SHEET_PLANS, PLANS_HEADERS);

  const valuesObj = {
    PlanID: plan.planId, ClientID: client.id, ClientName: client.name, Age: client.age || '', Phone: client.phone || '',
    Goal: profile.goal, DietType: profile.dietType, ProgramStartDate: profile.programStartDate, ProgramStartWeight: profile.programStartWeight,
    WeekNo: plan.weekNo, StartDate: plan.startDate, EndDate: plan.endDate, HighlightNote: plan.highlightNote,
    OnRising: profile.onRising, BeforeExercise: profile.beforeExercise, AfterExercise: profile.afterExercise,
    Brunch: profile.brunch, Snack: profile.snack, BedTime: profile.bedTime,
    GeneralNotes: plan.generalNotes, PdfFileId: pdf.id, PdfUrl: pdf.url, CreatedAt: nowString_()
  };
  days.forEach(function (d, i) {
    valuesObj['Day' + (i + 1) + 'Lunch'] = d.lunch;
    valuesObj['Day' + (i + 1) + 'Dinner'] = d.dinner;
  });

  sheet.appendRow(rowFromHeaders_(PLANS_HEADERS, valuesObj));
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

// ---------------------------------------------------------------------------
// PDF generation — built directly with DocumentApp, page by page.
// ---------------------------------------------------------------------------

function createDietPlanPdf_(client, profile, plan, days) {
  const displayStart = formatDateForDisplay_(plan.startDate);
  const displayEnd = formatDateForDisplay_(plan.endDate);
  const fileName = sanitizeFileName_(
    (client.name || 'Client') + ' - Week ' + plan.weekNo + ' Diet Plan - ' + displayStart + ' to ' + displayEnd
  ) + '.pdf';

  const doc = DocumentApp.create(fileName);
  const body = doc.getBody();
  body.setMarginTop(30).setMarginBottom(30).setMarginLeft(40).setMarginRight(40);

  buildCoverPage_(body, client, profile, plan);
  body.appendPageBreak();
  buildCommonDailyPage_(body, profile);
  body.appendPageBreak();
  buildLunchPage_(body, plan, days);
  body.appendPageBreak();
  buildDinnerPage_(body, plan, days);
  body.appendPageBreak();
  buildGuidelinesPage_(body);
  body.appendPageBreak();
  buildProgressTrackerPage_(body, profile);
  body.appendPageBreak();
  buildContactPage_(body);

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

function buildCoverPage_(body, client, profile, plan) {
  buildCoverHeader_(body, plan.weekNo);
  body.appendParagraph('');

  const preparedFor = body.appendParagraph('Prepared for');
  preparedFor.editAsText().setForegroundColor(TEXT_MUTED).setFontSize(11);

  const nameLine = body.appendParagraph(client.name || '-');
  nameLine.editAsText().setBold(true).setFontSize(20).setForegroundColor(DARK_GREEN);

  body.appendParagraph('');

  appendLabelValueTable_(body, [
    ['Start Date', displayDate_(plan.startDate)],
    ['End Date', displayDate_(plan.endDate)],
    ['Start Weight', profile.programStartWeight ? profile.programStartWeight + ' kg' : ''],
    ['Goal', profile.goal],
    ['Diet Type', profile.dietType]
  ]);

  body.appendParagraph('');
  appendHighlightBanner_(body, plan.highlightNote || CONFIG.DEFAULT_HIGHLIGHT);
  body.appendParagraph('');
  appendCoachFooter_(body);
}

function buildCoverHeader_(body, weekNo) {
  const table = body.appendTable([['']]);
  table.setBorderWidth(0);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(DARK_GREEN);
  cell.setPaddingTop(14).setPaddingBottom(14).setPaddingLeft(16).setPaddingRight(16);

  const tagline = cell.getChild(0).asParagraph();
  tagline.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const taglineText = tagline.editAsText();
  taglineText.setText(CONFIG.DOC_TAGLINE);
  taglineText.setBold(true);
  taglineText.setFontSize(11);
  taglineText.setForegroundColor('#d8e6dc');

  const titlePara = cell.appendParagraph(CONFIG.DOC_TITLE);
  titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const titleText = titlePara.editAsText();
  titleText.setBold(true);
  titleText.setFontSize(22);
  titleText.setForegroundColor('#ffffff');

  const weekPara = cell.appendParagraph('WEEK ' + displayWeekNo_(weekNo));
  weekPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const weekText = weekPara.editAsText();
  weekText.setBold(true);
  weekText.setFontSize(13);
  weekText.setForegroundColor(GOLD_TEXT);

  return table;
}

function appendHighlightBanner_(body, text) {
  if (!text) return null;
  const table = body.appendTable([['']]);
  table.setBorderWidth(0);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(GOLD);
  cell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(12).setPaddingRight(12);
  const para = cell.getChild(0).asParagraph();
  para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const t = para.editAsText();
  t.setText('★ ' + text + ' ★');
  t.setBold(true);
  t.setForegroundColor(DARK_GREEN);
  t.setFontSize(12);
  return table;
}

function appendCoachFooter_(body) {
  const table = body.appendTable([['']]);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(LIGHT_GREEN);
  cell.setPaddingTop(10).setPaddingBottom(10);
  const namePara = cell.getChild(0).asParagraph();
  namePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const nameText = namePara.editAsText();
  nameText.setText(CONFIG.DIETICIAN_NAME + '  —  ' + CONFIG.CREDENTIALS);
  nameText.setBold(true);
  nameText.setForegroundColor(DARK_GREEN);
  nameText.setFontSize(12);

  const contactParts = [CONFIG.PHONE, CONFIG.EMAIL].filter(Boolean);
  if (contactParts.length) {
    const contactPara = cell.appendParagraph(contactParts.join('   |   '));
    contactPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    contactPara.editAsText().setFontSize(10).setForegroundColor(TEXT_MUTED);
  }
  return table;
}

function buildCommonDailyPage_(body, profile) {
  appendSectionHeader_(body, 'COMMON DAILY PLAN', 'These meals are the same every day throughout the week');
  body.appendParagraph('');

  const items = [
    ['On Rising', profile.onRising],
    ['Before Exercise', profile.beforeExercise],
    ['After Exercise', profile.afterExercise],
    ['Brunch', profile.brunch],
    ['Snack', profile.snack],
    ['Bed Time', profile.bedTime]
  ].filter(function (row) { return row[1]; });

  if (items.length) {
    const rows = [['Meal Time', 'What To Eat']].concat(items);
    const table = body.appendTable(rows);
    styleHeaderRow_(table.getRow(0));
    for (let r = 1; r < table.getNumRows(); r++) {
      const labelCell = table.getRow(r).getCell(0);
      labelCell.setBackgroundColor(LIGHT_GREEN);
      labelCell.getChild(0).asParagraph().editAsText().setBold(true);
    }
  } else {
    body.appendParagraph('No common daily items added for this client yet.').editAsText().setForegroundColor(TEXT_MUTED);
  }

  body.appendParagraph('');
  appendNoteBox_(body, 'Daily Hydration Goal', CONFIG.HYDRATION_NOTE, LIGHT_GOLD);
}

function buildLunchPage_(body, plan, days) {
  appendSectionHeader_(body, 'LUNCH PLAN', CONFIG.LUNCH_TIME_LABEL + '   |   Week ' + displayWeekNo_(plan.weekNo) + '   |   ' + displayDate_(plan.startDate) + ' - ' + displayDate_(plan.endDate));
  body.appendParagraph('');
  appendDayMealTable_(body, 'Lunch Meal', days, 'lunch');
}

function buildDinnerPage_(body, plan, days) {
  appendSectionHeader_(body, 'DINNER PLAN', CONFIG.DINNER_TIME_LABEL + '   |   Week ' + displayWeekNo_(plan.weekNo) + '   |   ' + displayDate_(plan.startDate) + ' - ' + displayDate_(plan.endDate));
  body.appendParagraph('');
  appendDayMealTable_(body, 'Dinner Meal', days, 'dinner');
  body.appendParagraph('');
  appendNoteBox_(body, 'Important', CONFIG.DINNER_NOTE, LIGHT_GOLD);

  if (plan.generalNotes) {
    body.appendParagraph('');
    appendNoteBox_(body, "This Week's Note", plan.generalNotes, LIGHT_GREEN);
  }
}

function buildGuidelinesPage_(body) {
  appendSectionHeader_(body, 'DIET GUIDELINES', 'Follow these consistently for best results');
  body.appendParagraph('');

  const maxLen = Math.max(DOS_LIST.length, DONTS_LIST.length);
  const rows = [["DO'S", "DON'TS"]];
  for (let i = 0; i < maxLen; i++) {
    rows.push([
      DOS_LIST[i] ? '✓  ' + DOS_LIST[i] : '',
      DONTS_LIST[i] ? '✗  ' + DONTS_LIST[i] : ''
    ]);
  }
  const table = body.appendTable(rows);
  const headerRow = table.getRow(0);
  headerRow.getCell(0).setBackgroundColor(DARK_GREEN);
  headerRow.getCell(1).setBackgroundColor(GOLD);
  for (let c = 0; c < 2; c++) {
    const t = headerRow.getCell(c).getChild(0).asParagraph().editAsText();
    t.setBold(true);
    t.setForegroundColor('#ffffff');
  }

  body.appendParagraph('');
  appendSectionHeader_(body, 'LIFESTYLE & WELLNESS TIPS', null);
  body.appendParagraph('');
  const tipsTable = body.appendTable(LIFESTYLE_TIPS);
  for (let r = 0; r < tipsTable.getNumRows(); r++) {
    const labelCell = tipsTable.getRow(r).getCell(0);
    labelCell.setBackgroundColor(LIGHT_GREEN);
    const t = labelCell.getChild(0).asParagraph().editAsText();
    t.setBold(true);
    t.setForegroundColor(DARK_GREEN);
  }
}

function buildProgressTrackerPage_(body, profile) {
  appendSectionHeader_(body, 'WEEKLY PROGRESS TRACKER', 'Weigh yourself every Monday morning before eating — note it here');
  body.appendParagraph('');

  const summaryParts = [];
  if (profile.programStartDate) summaryParts.push('Start Date: ' + displayDate_(profile.programStartDate));
  if (profile.programStartWeight) summaryParts.push('Start Weight: ' + profile.programStartWeight + ' kg');
  if (profile.goal) summaryParts.push('Goal: ' + profile.goal);
  if (summaryParts.length) {
    appendNoteBox_(body, null, summaryParts.join('   |   '), LIGHT_GREEN);
    body.appendParagraph('');
  }

  const rows = [['Week', 'Date', 'Weight (kg)', 'Waist (cm)', 'Hips (cm)', 'Notes / Coach Feedback']];
  for (let i = 1; i <= 8; i++) {
    rows.push(['Week ' + i, '', '', '', '', '']);
  }
  const table = body.appendTable(rows);
  styleHeaderRow_(table.getRow(0), 9);
  for (let r = 1; r < table.getNumRows(); r++) {
    table.getRow(r).getCell(0).setBackgroundColor(LIGHT_GREEN);
  }

  body.appendParagraph('');
  appendQuoteBanner_(body, CONFIG.MOTIVATIONAL_QUOTE);
}

function appendQuoteBanner_(body, quote) {
  if (!quote) return null;
  const table = body.appendTable([['']]);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(DARK_GREEN);
  cell.setPaddingTop(12).setPaddingBottom(12);
  const para = cell.getChild(0).asParagraph();
  para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const t = para.editAsText();
  t.setText('“ ' + quote + ' ”');
  t.setItalic(true);
  t.setBold(true);
  t.setForegroundColor(GOLD_TEXT);
  t.setFontSize(12);
  return table;
}

function buildContactPage_(body) {
  appendSectionHeader_(body, 'DESIGNED BY YOUR COACH', null);
  body.appendParagraph('');
  appendCoachBioBox_(body);

  const hasReferral = !!CONFIG.REFERRAL_TEXT;
  const hasPrograms = CONFIG.OTHER_PROGRAMS && CONFIG.OTHER_PROGRAMS.length > 0;
  if (!hasReferral && !hasPrograms) return;

  body.appendParagraph('');
  const leftTitle = hasReferral ? 'Refer a Friend' : '';
  const rightTitle = hasPrograms ? 'Other Programs' : '';
  const leftBody = hasReferral ? CONFIG.REFERRAL_TEXT : '';
  const rightBody = hasPrograms ? CONFIG.OTHER_PROGRAMS.join(' • ') : 'Contact me for details.';

  const table = body.appendTable([[leftTitle, rightTitle], [leftBody, rightBody]]);
  table.getRow(0).getCell(0).setBackgroundColor(DARK_GREEN);
  table.getRow(0).getCell(1).setBackgroundColor(GOLD);
  for (let c = 0; c < 2; c++) {
    const t = table.getRow(0).getCell(c).getChild(0).asParagraph().editAsText();
    t.setBold(true);
    t.setForegroundColor('#ffffff');
  }
  table.getRow(1).getCell(0).setBackgroundColor(LIGHT_GREEN);
  table.getRow(1).getCell(1).setBackgroundColor(LIGHT_GOLD);
}

function appendCoachBioBox_(body) {
  const table = body.appendTable([['']]);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(LIGHT_GREEN);
  cell.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(14).setPaddingRight(14);

  const namePara = cell.getChild(0).asParagraph();
  const nameText = namePara.editAsText();
  nameText.setText(CONFIG.DIETICIAN_NAME);
  nameText.setBold(true);
  nameText.setFontSize(16);
  nameText.setForegroundColor(DARK_GREEN);

  const credPara = cell.appendParagraph(CONFIG.CREDENTIALS);
  credPara.editAsText().setItalic(true).setFontSize(10).setForegroundColor(TEXT_MUTED);

  const contactLine = [CONFIG.PHONE, CONFIG.EMAIL].filter(Boolean).join('   |   ');
  if (contactLine) {
    cell.appendParagraph(contactLine).editAsText().setFontSize(10);
  }

  const extraLine = [CONFIG.INSTAGRAM_HANDLE, CONFIG.WEBSITE].filter(Boolean).join('   |   ');
  if (extraLine) {
    cell.appendParagraph(extraLine).editAsText().setFontSize(10).setForegroundColor(TEXT_MUTED);
  }
}

// ---------------------------------------------------------------------------
// PDF-building helpers reused across pages
// ---------------------------------------------------------------------------

function appendSectionHeader_(body, title, subtitle) {
  const table = body.appendTable([['']]);
  table.setBorderWidth(0);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(DARK_GREEN);
  cell.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(14).setPaddingRight(14);

  const titlePara = cell.getChild(0).asParagraph();
  titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const titleText = titlePara.editAsText();
  titleText.setText(title);
  titleText.setBold(true);
  titleText.setFontSize(14);
  titleText.setForegroundColor('#ffffff');

  if (subtitle) {
    const subPara = cell.appendParagraph(subtitle);
    subPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const subText = subPara.editAsText();
    subText.setItalic(true);
    subText.setFontSize(10);
    subText.setForegroundColor('#d8e6dc');
  }
  return table;
}

/** Two-column label/value table. Rows with an empty value are skipped. */
function appendLabelValueTable_(body, rows) {
  const filtered = rows.filter(function (r) { return r[1] !== null && r[1] !== undefined && String(r[1]).trim() !== ''; });
  if (!filtered.length) return null;
  const table = body.appendTable(filtered);
  for (let i = 0; i < table.getNumRows(); i++) {
    const labelCell = table.getRow(i).getCell(0);
    labelCell.setBackgroundColor(LIGHT_GREEN);
    labelCell.setWidth(150);
    const labelText = labelCell.getChild(0).asParagraph().editAsText();
    labelText.setBold(true);
    labelText.setForegroundColor(DARK_GREEN);
  }
  return table;
}

function appendDayMealTable_(body, columnLabel, days, key) {
  const rows = [['Day', columnLabel]];
  days.forEach(function (d, i) {
    rows.push([DAY_LABELS[i], d[key] || '-']);
  });
  const table = body.appendTable(rows);
  styleHeaderRow_(table.getRow(0));
  for (let r = 1; r < table.getNumRows(); r++) {
    const labelCell = table.getRow(r).getCell(0);
    labelCell.setBackgroundColor(LIGHT_GREEN);
    labelCell.getChild(0).asParagraph().editAsText().setBold(true);
  }
  return table;
}

function styleHeaderRow_(row, fontSize) {
  for (let c = 0; c < row.getNumCells(); c++) {
    const cell = row.getCell(c);
    cell.setBackgroundColor(DARK_GREEN);
    const t = cell.getChild(0).asParagraph().editAsText();
    t.setBold(true);
    t.setForegroundColor('#ffffff');
    if (fontSize) t.setFontSize(fontSize);
  }
}

function appendNoteBox_(body, title, text, bg) {
  if (!text) return null;
  const table = body.appendTable([['']]);
  table.setBorderWidth(0);
  const cell = table.getRow(0).getCell(0);
  cell.setBackgroundColor(bg || LIGHT_GOLD);
  cell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(12).setPaddingRight(12);

  const firstPara = cell.getChild(0).asParagraph();
  if (title) {
    const titleText = firstPara.editAsText();
    titleText.setText(title);
    titleText.setBold(true);
    titleText.setForegroundColor(DARK_GREEN);
    titleText.setFontSize(10);
    const bodyPara = cell.appendParagraph(text);
    bodyPara.editAsText().setFontSize(10);
  } else {
    const t = firstPara.editAsText();
    t.setText(text);
    t.setFontSize(10);
  }
  return table;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function nowString_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function formatDateForDisplay_(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return String(dateStr);
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Utilities.formatDate(date, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
}

function displayDate_(dateStr) {
  return formatDateForDisplay_(dateStr);
}

function displayWeekNo_(weekNo) {
  const s = String(weekNo).trim();
  return /^\d$/.test(s) ? '0' + s : s;
}

function sanitizeFileName_(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}
