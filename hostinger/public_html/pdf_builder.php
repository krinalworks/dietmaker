<?php
/**
 * Builds the diet plan PDF with Dompdf, mirroring the same 7-page layout
 * (cover, common daily plan, lunch, dinner, guidelines, tracker, contact)
 * as the Google Apps Script version of this app.
 */

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/helpers.php';

use Dompdf\Dompdf;
use Dompdf\Options;

/** Wraps a pictographic emoji in a span using the embedded Noto Emoji font (monochrome). Plain symbols like ✓ ✗ ★ don't need this — the default font already covers them. */
function emoji(string $char): string {
    return '<span class="emoji">' . $char . '</span>';
}

function pdf_css(): string {
    return <<<CSS
    body { font-family: "DejaVu Sans", sans-serif; font-size: 11px; color: #1f2430; }
    .emoji { font-family: "Noto Emoji"; }
    .page { padding: 6px 4px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }

    .cover-banner { background: #1d3c2b; color: #ffffff; text-align: center; padding: 16px; border-radius: 6px; }
    .cover-banner .tagline { font-size: 11px; font-weight: bold; color: #d8e6dc; }
    .cover-banner .title { font-size: 24px; font-weight: bold; margin: 8px 0; }
    .cover-banner .week { font-size: 14px; font-weight: bold; color: #e3b968; }

    .prepared-for { color: #6b7280; font-size: 11px; margin: 16px 0 0; }
    .client-name { font-size: 22px; font-weight: bold; color: #1d3c2b; margin: 2px 0 16px; }

    table.data { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 0.75px solid #d8e0da; }
    table.data th, table.data td { border: 0.75px solid #d8e0da; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 10.5px; }
    table.data th { background: #1d3c2b; color: #ffffff; font-weight: bold; }
    table.data th.gold { background: #c99a3c; }
    table.data td.label { background: #eaf2ec; font-weight: bold; color: #1d3c2b; width: 150px; }
    table.data tr.alt td:not(.label) { background: #f4f8f5; }
    table.data td.do-cell { background: #eaf7ee; color: #1e7e34; }
    table.data td.dont-cell { background: #fdecea; color: #c0392b; }

    .banner { background: #1d3c2b; color: #ffffff; text-align: center; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; }
    .banner .title { font-size: 14px; font-weight: bold; }
    .banner .subtitle { font-size: 10px; font-style: italic; color: #d8e6dc; margin-top: 2px; }

    .highlight-banner { background: #c99a3c; color: #1d3c2b; text-align: center; font-weight: bold; font-size: 12px; padding: 8px 12px; border-radius: 6px; margin: 12px 0; }

    .coach-footer { background: #eaf2ec; text-align: center; padding: 10px; border-radius: 6px; }
    .coach-footer .name { font-weight: bold; color: #1d3c2b; font-size: 12px; }
    .coach-footer .contact { color: #6b7280; font-size: 10px; margin-top: 4px; }

    .note-box { padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10px; background: #faf1de; }
    .note-box.green { background: #eaf2ec; }
    .note-box .note-title { font-weight: bold; color: #1d3c2b; display: block; margin-bottom: 2px; }

    .quote-banner { background: #1d3c2b; color: #e3b968; text-align: center; font-style: italic; font-weight: bold; padding: 12px; border-radius: 6px; font-size: 12px; }

    .muted { color: #6b7280; }

    table.promo { width: 100%; border-collapse: collapse; margin-top: 12px; }
    table.promo td { padding: 8px 10px; vertical-align: top; font-size: 10px; }
    table.promo .promo-head { color: #ffffff; font-weight: bold; text-align: center; }
    table.promo .promo-head.green { background: #1d3c2b; }
    table.promo .promo-head.gold { background: #c99a3c; }
    table.promo .promo-body.green { background: #eaf2ec; }
    table.promo .promo-body.gold { background: #faf1de; }
    CSS;
}

function render_cover_page(array $client, array $profile, array $plan): string {
    $config = app_config();
    $weekNo = display_week_no($plan['weekNo']);
    $highlight = $plan['highlightNote'] !== '' ? $plan['highlightNote'] : $config['default_highlight'];

    $rows = '';
    $infoRows = [
        ['Start Date', format_date_display($plan['startDate'])],
        ['End Date', format_date_display($plan['endDate'])],
        ['Start Weight', $profile['programStartWeight'] !== '' ? $profile['programStartWeight'] . ' kg' : ''],
        ['Goal', $profile['goal']],
        ['Diet Type', $profile['dietType']],
    ];
    foreach ($infoRows as $row) {
        if (trim((string)$row[1]) === '') continue;
        $rows .= '<tr><td class="label">' . h($row[0]) . '</td><td>' . h($row[1]) . '</td></tr>';
    }

    $contactParts = array_filter([$config['phone'], $config['email']]);
    $contactLine = $contactParts ? h(implode('   |   ', $contactParts)) : '';

    return '<div class="page">'
        . '<div class="cover-banner">'
        . '<div class="tagline">' . h($config['doc_tagline']) . '</div>'
        . '<div class="title">' . h($config['doc_title']) . '</div>'
        . '<div class="week">WEEK ' . h($weekNo) . '</div>'
        . '</div>'
        . '<p class="prepared-for">Prepared for</p>'
        . '<p class="client-name">' . h($client['name'] ?: '-') . '</p>'
        . ($rows ? '<table class="data">' . $rows . '</table>' : '')
        . '<div class="highlight-banner">' . emoji('⭐') . ' ' . h($highlight) . ' ' . emoji('⭐') . '</div>'
        . '<div class="coach-footer">'
        . '<div class="name">' . h($config['dietician_name']) . '  —  ' . h($config['credentials']) . '</div>'
        . ($contactLine ? '<div class="contact">' . $contactLine . '</div>' : '')
        . '</div>'
        . '</div>';
}

function render_common_daily_page(array $profile): string {
    $config = app_config();
    $items = [
        [emoji('🌅') . ' On Rising', $profile['onRising']],
        [emoji('💪') . ' Before Exercise', $profile['beforeExercise']],
        [emoji('🥤') . ' After Exercise', $profile['afterExercise']],
        [emoji('🥗') . ' Brunch', $profile['brunch']],
        [emoji('☕') . ' Snack', $profile['snack']],
        [emoji('🌙') . ' Bed Time', $profile['bedTime']],
    ];
    $items = array_values(array_filter($items, fn($row) => trim((string)$row[1]) !== ''));

    $body = '';
    if ($items) {
        $rows = '<tr><th>Meal Time</th><th>What To Eat</th></tr>';
        foreach ($items as $i => $row) {
            $altClass = $i % 2 === 1 ? ' class="alt"' : '';
            $rows .= '<tr' . $altClass . '><td class="label">' . $row[0] . '</td><td>' . h($row[1]) . '</td></tr>';
        }
        $body = '<table class="data">' . $rows . '</table>';
    } else {
        $body = '<p class="muted">No common daily items added for this client yet.</p>';
    }

    return '<div class="page">'
        . render_section_banner('COMMON DAILY PLAN', 'These meals are the same every day throughout the week')
        . $body
        . render_note_box(emoji('💧') . ' Daily Hydration Goal', h($config['hydration_note']))
        . '</div>';
}

function render_meal_page(string $heading, string $timeLabel, array $plan, array $days, string $key): string {
    $weekNo = display_week_no($plan['weekNo']);
    $subtitle = $timeLabel . '   |   Week ' . $weekNo . '   |   ' . format_date_display($plan['startDate']) . ' - ' . format_date_display($plan['endDate']);
    $columnLabel = $key === 'lunch' ? 'Lunch Meal' : 'Dinner Meal';

    $rows = '<tr><th>Date</th><th>' . h($columnLabel) . '</th></tr>';
    foreach ($days as $i => $day) {
        $altClass = $i % 2 === 1 ? ' class="alt"' : '';
        $label = plan_day_label($plan['startDate'], $i);
        $meal = $day[$key] !== '' ? $day[$key] : '-';
        $rows .= '<tr' . $altClass . '><td class="label">' . h($label) . '</td><td>' . h($meal) . '</td></tr>';
    }

    return render_section_banner($heading, $subtitle) . '<table class="data">' . $rows . '</table>';
}

function render_lunch_page(array $plan, array $days): string {
    $config = app_config();
    return '<div class="page">' . render_meal_page('LUNCH PLAN', $config['lunch_time_label'], $plan, $days, 'lunch') . '</div>';
}

function render_dinner_page(array $plan, array $days): string {
    $config = app_config();
    $html = '<div class="page">' . render_meal_page('DINNER PLAN', $config['dinner_time_label'], $plan, $days, 'dinner');
    $html .= render_note_box(emoji('⚠️') . ' Important', h($config['dinner_note']));
    if (trim((string)$plan['generalNotes']) !== '') {
        $html .= render_note_box(emoji('📝') . " This Week's Note", h($plan['generalNotes']), true);
    }
    return $html . '</div>';
}

function render_guidelines_page(): string {
    $config = app_config();
    $dos = $config['dos_list'];
    $donts = $config['donts_list'];
    $maxLen = max(count($dos), count($donts));

    $rows = '<tr><th>DO\'S</th><th class="gold">DON\'TS</th></tr>';
    for ($i = 0; $i < $maxLen; $i++) {
        $doText = $dos[$i] ?? '';
        $dontText = $donts[$i] ?? '';
        $doCell = $doText !== '' ? '<td class="do-cell">' . emoji('✅') . ' ' . h($doText) . '</td>' : '<td></td>';
        $dontCell = $dontText !== '' ? '<td class="dont-cell">' . emoji('❌') . ' ' . h($dontText) . '</td>' : '<td></td>';
        $rows .= '<tr>' . $doCell . $dontCell . '</tr>';
    }
    $guideTable = '<table class="data">' . $rows . '</table>';

    $tipsRows = '';
    foreach ($config['lifestyle_tips'] as $tip) {
        $tipsRows .= '<tr><td class="label">' . h($tip[0]) . '</td><td>' . h($tip[1]) . '</td></tr>';
    }
    $tipsTable = '<table class="data">' . $tipsRows . '</table>';

    return '<div class="page">'
        . render_section_banner('DIET GUIDELINES', 'Follow these consistently for best results')
        . $guideTable
        . render_section_banner('LIFESTYLE & WELLNESS TIPS', null)
        . $tipsTable
        . '</div>';
}

function render_tracker_page(array $profile): string {
    $config = app_config();
    $summaryParts = [];
    if ($profile['programStartDate'] !== '') $summaryParts[] = 'Start Date: ' . format_date_display($profile['programStartDate']);
    if ($profile['programStartWeight'] !== '') $summaryParts[] = 'Start Weight: ' . $profile['programStartWeight'] . ' kg';
    if ($profile['goal'] !== '') $summaryParts[] = 'Goal: ' . $profile['goal'];

    $summaryBox = $summaryParts ? render_note_box(null, h(implode('   |   ', $summaryParts)), true) : '';

    $rows = '<tr><th>Week</th><th>Date</th><th>Weight (kg)</th><th>Waist (cm)</th><th>Hips (cm)</th><th>Notes / Coach Feedback</th></tr>';
    for ($i = 1; $i <= 8; $i++) {
        $altClass = $i % 2 === 0 ? ' class="alt"' : '';
        $rows .= '<tr' . $altClass . '><td class="label">Week ' . $i . '</td><td></td><td></td><td></td><td></td><td></td></tr>';
    }
    $table = '<table class="data">' . $rows . '</table>';

    return '<div class="page">'
        . render_section_banner('WEEKLY PROGRESS TRACKER', 'Weigh yourself every Monday morning before eating — note it here')
        . $summaryBox
        . $table
        . '<div class="quote-banner">&#8220; ' . h($config['motivational_quote']) . ' &#8221;</div>'
        . '</div>';
}

function render_contact_page(): string {
    $config = app_config();
    $contactLine = array_filter([$config['phone'], $config['email']]);
    $extraLine = array_filter([$config['instagram_handle'] ? '@' . $config['instagram_handle'] : '', $config['website']]);

    $bio = '<div class="note-box green">'
        . '<span class="note-title" style="font-size:14px;">' . h($config['dietician_name']) . '</span>'
        . '<span class="muted" style="font-style: italic;">' . h($config['credentials']) . '</span><br>'
        . ($contactLine ? h(implode('   |   ', $contactLine)) . '<br>' : '')
        . ($extraLine ? '<span class="muted">' . h(implode('   |   ', $extraLine)) . '</span>' : '')
        . '</div>';

    $hasReferral = trim((string)$config['referral_text']) !== '';
    $hasPrograms = !empty($config['other_programs']);
    $promo = '';
    if ($hasReferral || $hasPrograms) {
        $rightBody = $hasPrograms ? h(implode(' • ', $config['other_programs'])) : 'Contact me for details.';
        $promo = '<table class="promo"><tr>'
            . '<td class="promo-head green">' . ($hasReferral ? 'Refer a Friend' : '') . '</td>'
            . '<td class="promo-head gold">' . ($hasPrograms ? 'Other Programs' : '') . '</td>'
            . '</tr><tr>'
            . '<td class="promo-body green">' . ($hasReferral ? h($config['referral_text']) : '') . '</td>'
            . '<td class="promo-body gold">' . $rightBody . '</td>'
            . '</tr></table>';
    }

    return '<div class="page">'
        . render_section_banner('DESIGNED BY YOUR COACH', null)
        . $bio
        . $promo
        . '</div>';
}

function render_section_banner(string $title, ?string $subtitle): string {
    $html = '<div class="banner"><div class="title">' . h($title) . '</div>';
    if ($subtitle) {
        $html .= '<div class="subtitle">' . h($subtitle) . '</div>';
    }
    return $html . '</div>';
}

function render_note_box(?string $title, string $text, bool $green = false): string {
    if (trim($text) === '') return '';
    $class = 'note-box' . ($green ? ' green' : '');
    $titleHtml = $title ? '<span class="note-title">' . $title . '</span>' : '';
    return '<div class="' . $class . '">' . $titleHtml . $text . '</div>';
}

/**
 * Builds the full diet plan PDF and saves it under storage/pdfs/.
 * Returns ['id' => filename, 'url' => public URL, 'fileName' => filename].
 */
function build_diet_plan_pdf(array $client, array $profile, array $plan, array $days): array {
    $displayStart = format_date_display($plan['startDate']);
    $displayEnd = format_date_display($plan['endDate']);
    $fileName = sanitize_filename(
        ($client['name'] ?: 'Client') . ' - Week ' . $plan['weekNo'] . ' Diet Plan - ' . $displayStart . ' to ' . $displayEnd
    ) . '.pdf';

    $html = '<html><head><meta charset="utf-8"><style>' . pdf_css() . '</style></head><body>'
        . render_cover_page($client, $profile, $plan)
        . render_common_daily_page($profile)
        . render_lunch_page($plan, $days)
        . render_dinner_page($plan, $days)
        . render_guidelines_page()
        . render_tracker_page($profile)
        . render_contact_page()
        . '</body></html>';

    $fontDir = __DIR__ . '/storage/fonts';
    $options = new Options();
    $options->setFontDir($fontDir);
    $options->setFontCache($fontDir);
    $options->setChroot(__DIR__);
    $options->setIsRemoteEnabled(false);
    $options->setIsHtml5ParserEnabled(true);

    $dompdf = new Dompdf($options);

    $emojiFont = $fontDir . '/NotoEmoji-Regular.ttf';
    if (is_file($emojiFont)) {
        $dompdf->getFontMetrics()->registerFont(
            ['family' => 'Noto Emoji', 'style' => 'normal', 'weight' => 'normal'],
            $emojiFont
        );
    }

    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $pdfDir = __DIR__ . '/storage/pdfs';
    if (!is_dir($pdfDir)) {
        mkdir($pdfDir, 0755, true);
    }

    $storedName = generate_uuid() . '.pdf';
    $storedPath = $pdfDir . '/' . $storedName;
    file_put_contents($storedPath, $dompdf->output());

    $url = base_url() . '/storage/pdfs/' . $storedName;

    return ['id' => $storedName, 'url' => $url, 'fileName' => $fileName];
}
