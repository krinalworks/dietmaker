<?php
require_once __DIR__ . '/helpers.php';
$config = app_config();
$appTitle = h($config['app_title']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $appTitle ?></title>
  <link rel="stylesheet" href="assets/app.css">
</head>
<body>
  <div class="app">
    <div class="app-header">
      <h1><?= $appTitle ?></h1>
      <p>Fill in the plan and tap Generate PDF.</p>
    </div>

    <div id="banner" class="banner hidden"></div>

    <form id="planForm">
      <section class="card">
        <h2>Client</h2>
        <label for="clientSelect">Select Client</label>
        <select id="clientSelect">
          <option value="">Loading clients…</option>
        </select>

        <div id="newClientFields" class="hidden">
          <label for="newClientName">New Client Name</label>
          <input id="newClientName" type="text" placeholder="Full name">

          <label for="newClientAge">Age</label>
          <input id="newClientAge" type="number" inputmode="numeric" min="0" placeholder="Optional">

          <label for="newClientPhone">Phone</label>
          <input id="newClientPhone" type="tel" placeholder="Optional">

          <label for="newClientNotes">Notes</label>
          <textarea id="newClientNotes" rows="2" placeholder="Allergies, preferences, etc. (optional)"></textarea>
        </div>
      </section>

      <section class="card">
        <h2>Program Details</h2>
        <p class="hint">Filled in once per client — carries forward automatically to future weeks, edit only if it changes.</p>
        <label for="goal">Goal</label>
        <input id="goal" type="text" placeholder="e.g. Fat Loss & Weight Management">

        <label for="dietType">Diet Type</label>
        <input id="dietType" type="text" placeholder="e.g. Vegetarian">

        <label for="programStartDate">Program Start Date</label>
        <input id="programStartDate" type="date">

        <label for="programStartWeight">Starting Weight (kg)</label>
        <input id="programStartWeight" type="text" inputmode="decimal" placeholder="e.g. 95">
      </section>

      <section class="card">
        <h2>Common Daily Plan</h2>
        <p class="hint">Same every day of the week — also carries forward automatically.</p>
        <label for="onRising">On Rising</label>
        <input id="onRising" type="text" placeholder="e.g. Flax seeds powder with water">

        <label for="beforeExercise">Before Exercise</label>
        <input id="beforeExercise" type="text" placeholder="e.g. 5 Almond 2 Walnut">

        <label for="afterExercise">After Exercise</label>
        <input id="afterExercise" type="text" placeholder="e.g. Protein powder">

        <label for="brunch">Brunch</label>
        <input id="brunch" type="text" placeholder="e.g. Isabgol with water">

        <label for="snack">Snack</label>
        <input id="snack" type="text" placeholder="e.g. Green tea + pumpkin seeds">

        <label for="bedTime">Bed Time</label>
        <input id="bedTime" type="text" placeholder="e.g. Cinnamon tea">
      </section>

      <section class="card">
        <h2>This Week</h2>
        <label for="weekNo">Week Number</label>
        <input id="weekNo" type="number" inputmode="numeric" min="1" placeholder="e.g. 1">

        <label for="startDate">Start Date</label>
        <input id="startDate" type="date">

        <label for="endDate">End Date</label>
        <input id="endDate" type="date">
        <p class="hint">End date auto-fills to 6 days after the start date — you can still change it.</p>

        <label for="highlightNote">Highlight Banner (optional)</label>
        <input id="highlightNote" type="text" placeholder="e.g. 45 Minutes Fast Walk is Compulsion Every Day">
      </section>

      <section class="card">
        <h2>Meals — Day 1 to Day 7</h2>
        <div id="daysContainer"></div>
      </section>

      <section class="card">
        <h2>This Week's Note</h2>
        <textarea id="generalNotes" rows="3" placeholder="Optional extra note shown on the dinner page"></textarea>
      </section>

      <div class="actions">
        <button type="button" id="clearBtn" class="btn secondary">Clear</button>
        <button type="submit" id="generateBtn" class="btn primary">Generate PDF</button>
      </div>
    </form>

    <section class="card hidden" id="recentPlansSection">
      <h2>Recent Plans For This Client</h2>
      <ul id="recentPlansList"></ul>
    </section>

    <div class="coach-footer hidden" id="coachFooter">
      <p class="coach-name" id="coachName"></p>
      <p class="coach-cred" id="coachCred"></p>
      <div class="coach-links">
        <a id="coachPhone" href="#">📞 Call</a>
        <a id="coachInsta" href="#" target="_blank" rel="noopener">📷 Instagram</a>
      </div>
    </div>
  </div>

  <div id="loadingOverlay" class="overlay hidden">
    <div class="spinner"></div>
    <p id="loadingText">Generating PDF…</p>
  </div>

  <script src="assets/app.js"></script>
</body>
</html>
