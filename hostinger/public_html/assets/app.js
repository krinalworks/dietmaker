var state = { clients: [] };
var PROFILE_FIELDS = ['goal', 'dietType', 'programStartDate', 'programStartWeight', 'onRising', 'beforeExercise', 'afterExercise', 'brunch', 'snack', 'bedTime'];

document.addEventListener('DOMContentLoaded', function () {
  buildDaysUI();
  wireEvents();
  loadInitialData();
});

// --- Small fetch helpers -----------------------------------------------

function apiGet(url) {
  return fetch(url, { headers: { 'Accept': 'application/json' } })
    .then(function (res) { return res.json().catch(function () { throw new Error('Server returned an invalid response.'); }); })
    .then(function (data) {
      if (data && data.error) throw new Error(data.error);
      return data;
    });
}

function apiPost(url, payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function (res) { return res.json().catch(function () { throw new Error('Server returned an invalid response.'); }); });
}

// --- Day accordion -------------------------------------------------------

function buildDaysUI() {
  var container = document.getElementById('daysContainer');
  var labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  labels.forEach(function (label, i) {
    var dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    if (i === 0) dayDiv.classList.add('open');
    dayDiv.dataset.dayIndex = String(i);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'day-toggle';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = label;
    var chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '›';
    toggle.appendChild(titleSpan);
    toggle.appendChild(chev);
    dayDiv.appendChild(toggle);

    var bodyDiv = document.createElement('div');
    bodyDiv.className = 'day-body';
    if (i !== 0) bodyDiv.classList.add('hidden');

    var lunchLabel = document.createElement('label');
    lunchLabel.textContent = 'Lunch';
    var lunchArea = document.createElement('textarea');
    lunchArea.id = 'day' + i + 'Lunch';
    lunchArea.rows = 2;
    lunchArea.placeholder = 'e.g. Dal, rice, salad';

    var dinnerLabel = document.createElement('label');
    dinnerLabel.textContent = 'Dinner';
    var dinnerArea = document.createElement('textarea');
    dinnerArea.id = 'day' + i + 'Dinner';
    dinnerArea.rows = 2;
    dinnerArea.placeholder = 'e.g. Soup and roti';

    bodyDiv.appendChild(lunchLabel);
    bodyDiv.appendChild(lunchArea);
    bodyDiv.appendChild(dinnerLabel);
    bodyDiv.appendChild(dinnerArea);
    dayDiv.appendChild(bodyDiv);

    container.appendChild(dayDiv);
  });

  container.addEventListener('click', onDayToggleClick);
}

function onDayToggleClick(e) {
  var toggle = e.target.closest('.day-toggle');
  if (!toggle) return;
  var dayDiv = toggle.closest('.day');
  var bodyDiv = dayDiv.querySelector('.day-body');
  var willOpen = !dayDiv.classList.contains('open');
  dayDiv.classList.toggle('open', willOpen);
  bodyDiv.classList.toggle('hidden', !willOpen);
}

function wireEvents() {
  document.getElementById('clientSelect').addEventListener('change', onClientChange);
  document.getElementById('startDate').addEventListener('change', onStartDateChange);
  document.getElementById('planForm').addEventListener('submit', onSubmit);
  document.getElementById('clearBtn').addEventListener('click', onClear);
}

// --- Data loading ----------------------------------------------------------

function loadInitialData() {
  apiGet('api/get_initial_data.php')
    .then(function (data) {
      state.clients = data.clients || [];
      populateClientDropdown();
      renderCoachFooter(data.coach);
    })
    .catch(function (err) {
      showBanner('error', 'Could not load data: ' + errMessage(err));
    });
}

function renderCoachFooter(coach) {
  if (!coach || !coach.name) return;
  document.getElementById('coachName').textContent = coach.name;
  document.getElementById('coachCred').textContent = coach.credentials || '';

  var phoneLink = document.getElementById('coachPhone');
  if (coach.phone) {
    phoneLink.href = 'tel:' + coach.phone.replace(/\s+/g, '');
    phoneLink.textContent = '📞 ' + coach.phone;
    phoneLink.classList.remove('hidden');
  } else {
    phoneLink.classList.add('hidden');
  }

  var instaLink = document.getElementById('coachInsta');
  if (coach.instagramHandle) {
    instaLink.href = 'https://instagram.com/' + coach.instagramHandle;
    instaLink.textContent = '📷 @' + coach.instagramHandle;
    instaLink.classList.remove('hidden');
  } else {
    instaLink.classList.add('hidden');
  }

  document.getElementById('coachFooter').classList.remove('hidden');
}

function populateClientDropdown() {
  var select = document.getElementById('clientSelect');
  select.innerHTML = '';

  var placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a client';
  select.appendChild(placeholder);

  state.clients
    .slice()
    .sort(function (a, b) { return a.name.localeCompare(b.name); })
    .forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });

  var addNew = document.createElement('option');
  addNew.value = '__new__';
  addNew.textContent = '+ Add New Client';
  select.appendChild(addNew);
}

function onClientChange() {
  var value = document.getElementById('clientSelect').value;
  var newFields = document.getElementById('newClientFields');
  var recentSection = document.getElementById('recentPlansSection');

  if (value === '__new__') {
    newFields.classList.remove('hidden');
    recentSection.classList.add('hidden');
    clearProfileFields();
  } else {
    newFields.classList.add('hidden');
    if (value) {
      loadRecentPlans(value);
      prefillProfileFields(value);
    } else {
      recentSection.classList.add('hidden');
      clearProfileFields();
    }
  }
}

function prefillProfileFields(clientId) {
  var client = state.clients.find(function (c) { return c.id === clientId; });
  if (!client) return;
  PROFILE_FIELDS.forEach(function (field) {
    document.getElementById(field).value = client[field] || '';
  });
}

function clearProfileFields() {
  PROFILE_FIELDS.forEach(function (field) {
    document.getElementById(field).value = '';
  });
}

function loadRecentPlans(clientId) {
  apiGet('api/recent_plans.php?clientId=' + encodeURIComponent(clientId))
    .then(function (plans) { renderRecentPlans(plans || []); })
    .catch(function () { /* non-critical, ignore */ });
}

function renderRecentPlans(plans) {
  var section = document.getElementById('recentPlansSection');
  var list = document.getElementById('recentPlansList');
  list.innerHTML = '';

  if (!plans.length) {
    section.classList.add('hidden');
    return;
  }

  plans.forEach(function (p) {
    var li = document.createElement('li');
    var label = document.createElement('span');
    label.textContent = 'Week ' + p.weekNo + ' (' + p.startDate + ' to ' + p.endDate + ')';
    var link = document.createElement('a');
    link.href = p.pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open PDF';
    li.appendChild(label);
    li.appendChild(link);
    list.appendChild(li);
  });

  section.classList.remove('hidden');
}

function onStartDateChange() {
  var startVal = document.getElementById('startDate').value;
  if (!startVal) return;
  var start = new Date(startVal + 'T00:00:00');
  var end = new Date(start.getTime());
  end.setDate(end.getDate() + 6);
  document.getElementById('endDate').value = toIsoDate(end);
}

function toIsoDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function collectDays() {
  var days = [];
  for (var i = 0; i < 7; i++) {
    days.push({
      lunch: document.getElementById('day' + i + 'Lunch').value,
      dinner: document.getElementById('day' + i + 'Dinner').value
    });
  }
  return days;
}

function clientSideValidate() {
  var clientSelect = document.getElementById('clientSelect').value;
  if (!clientSelect) {
    return 'Select a client or add a new client.';
  }
  if (clientSelect === '__new__' && !document.getElementById('newClientName').value.trim()) {
    return 'Enter a name for the new client.';
  }
  if (!document.getElementById('weekNo').value) {
    return 'Week number is required.';
  }
  if (!document.getElementById('startDate').value) {
    return 'Start date is required.';
  }
  if (!document.getElementById('endDate').value) {
    return 'End date is required.';
  }
  var days = collectDays();
  var hasMeal = days.some(function (d) { return d.lunch.trim() || d.dinner.trim(); });
  if (!hasMeal) {
    return 'Add at least one lunch or dinner entry.';
  }
  return null;
}

function onSubmit(e) {
  e.preventDefault();
  hideBanner();

  var validationError = clientSideValidate();
  if (validationError) {
    showBanner('error', validationError);
    return;
  }

  var clientSelect = document.getElementById('clientSelect').value;
  var confirmName = clientSelect === '__new__'
    ? document.getElementById('newClientName').value.trim()
    : (state.clients.find(function (c) { return c.id === clientSelect; }) || {}).name;
  var confirmWeek = document.getElementById('weekNo').value;
  var confirmed = window.confirm('Generate the PDF for ' + (confirmName || 'this client') + ' — Week ' + confirmWeek + '?');
  if (!confirmed) return;

  var payload = {
    clientId: clientSelect === '__new__' ? '' : clientSelect,
    newClientName: clientSelect === '__new__' ? document.getElementById('newClientName').value : '',
    newClientAge: clientSelect === '__new__' ? document.getElementById('newClientAge').value : '',
    newClientPhone: clientSelect === '__new__' ? document.getElementById('newClientPhone').value : '',
    newClientNotes: clientSelect === '__new__' ? document.getElementById('newClientNotes').value : '',
    goal: document.getElementById('goal').value,
    dietType: document.getElementById('dietType').value,
    programStartDate: document.getElementById('programStartDate').value,
    programStartWeight: document.getElementById('programStartWeight').value,
    onRising: document.getElementById('onRising').value,
    beforeExercise: document.getElementById('beforeExercise').value,
    afterExercise: document.getElementById('afterExercise').value,
    brunch: document.getElementById('brunch').value,
    snack: document.getElementById('snack').value,
    bedTime: document.getElementById('bedTime').value,
    weekNo: document.getElementById('weekNo').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    highlightNote: document.getElementById('highlightNote').value,
    days: collectDays(),
    generalNotes: document.getElementById('generalNotes').value
  };

  setLoading(true, 'Generating PDF…');

  apiPost('api/save_plan.php', payload)
    .then(function (result) {
      setLoading(false);
      if (result && result.ok) {
        onGenerateSuccess(result);
      } else {
        showBanner('error', (result && result.error) || 'Something went wrong. Please try again.');
      }
    })
    .catch(function (err) {
      setLoading(false);
      showBanner('error', errMessage(err));
    });
}

function onGenerateSuccess(result) {
  showBanner('success',
    'PDF generated for ' + result.client.name + '. ' +
    '<a href="' + result.pdfUrl + '" target="_blank" rel="noopener">Open PDF</a>'
  );

  if (result.client && result.client.id) {
    var profileSnapshot = {};
    PROFILE_FIELDS.forEach(function (field) {
      profileSnapshot[field] = document.getElementById(field).value;
    });

    var existing = state.clients.find(function (c) { return c.id === result.client.id; });
    if (existing) {
      Object.assign(existing, profileSnapshot);
    } else {
      state.clients.push(Object.assign({ id: result.client.id, name: result.client.name }, profileSnapshot));
    }

    populateClientDropdown();
    document.getElementById('clientSelect').value = result.client.id;
    document.getElementById('newClientFields').classList.add('hidden');
    loadRecentPlans(result.client.id);
  }
}

function onClear() {
  document.getElementById('planForm').reset();
  document.getElementById('newClientFields').classList.add('hidden');
  document.getElementById('recentPlansSection').classList.add('hidden');
  for (var i = 0; i < 7; i++) {
    document.getElementById('day' + i + 'Lunch').value = '';
    document.getElementById('day' + i + 'Dinner').value = '';
  }
  hideBanner();
}

function setLoading(isLoading, text) {
  var overlay = document.getElementById('loadingOverlay');
  var generateBtn = document.getElementById('generateBtn');
  if (isLoading) {
    document.getElementById('loadingText').textContent = text || 'Working…';
    overlay.classList.remove('hidden');
    generateBtn.disabled = true;
  } else {
    overlay.classList.add('hidden');
    generateBtn.disabled = false;
  }
}

function showBanner(type, html) {
  var banner = document.getElementById('banner');
  banner.className = 'banner ' + type;
  banner.innerHTML = html;
  banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideBanner() {
  var banner = document.getElementById('banner');
  banner.className = 'banner hidden';
  banner.innerHTML = '';
}

function errMessage(err) {
  return (err && err.message) ? err.message : String(err);
}
