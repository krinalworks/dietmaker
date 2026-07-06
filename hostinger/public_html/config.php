<?php
/**
 * Diet Plan Generator — configuration.
 *
 * Edit the values below to match your Hostinger MySQL database and your
 * brand/contact details. This file is the single source of truth for both
 * the web app footer and the generated PDF's contact page.
 */
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'REPLACE_WITH_DB_NAME',
        'user' => 'REPLACE_WITH_DB_USER',
        'pass' => 'REPLACE_WITH_DB_PASSWORD',
    ],

    'timezone' => 'Asia/Kolkata',
    'date_format' => 'd M Y', // PHP date() format — equivalent to "dd MMM yyyy"
    'app_title' => 'Diet Plan Generator',

    // --- Branding shown on the cover page of every PDF ---
    'doc_title' => 'CUSTOMIZED DIET PLAN',
    'doc_tagline' => 'Weight Management & Fat Loss Diet Plan',
    'default_highlight' => '45 Minutes Fast Walk is Compulsion Every Day',

    // --- Fixed labels for the lunch/dinner pages ---
    'lunch_time_label' => '1:00 PM – 2:00 PM',
    'dinner_time_label' => '7:00 PM',

    // --- Static notes reused on every PDF ---
    'hydration_note' => 'Drink 3 Litres of water every day. Prefer warm or room temperature water with meals. Avoid cold drinks and packaged juices entirely.',
    'dinner_note' => 'Always eat dinner before 8:00 PM. Dinner is kept light to support overnight fat metabolism.',
    'motivational_quote' => 'When you want to give up, remember why you started.',

    // --- Coach bio / contact, shown on the last PDF page and the app footer ---
    'dietician_name' => 'Foram Patel',
    'credentials' => 'Certified Nutritionist & Dietician',
    'phone' => '09724617765',
    'email' => 'Foram2206@gmail.com',
    'instagram_handle' => 'fitforam', // leave blank to omit
    'website' => '', // leave blank to omit
    'referral_text' => 'Share this plan with a friend. They receive 10% off their first plan. You receive 1 free follow-up session.',
    'other_programs' => [], // e.g. ['12-Week Transformation Program']

    // Static Diet Guidelines content — same for every client, so it's here
    // instead of the form.
    'dos_list' => [
        'Eat every 2.5 – 3 hours',
        'Chew each bite slowly (20+ times)',
        'Drink water 30 minutes before meals',
        'Walk 45 minutes every single day',
        'Sleep 7 – 8 hours each night',
        'Use rock salt instead of regular salt',
        'Eat dinner before 8:00 PM',
        'Keep phone away while eating',
    ],
    'donts_list' => [
        'Skip any meal',
        'Eat fried or processed food',
        'Consume refined sugar or maida',
        'Drink cold water with meals',
        'Eat after 8:00 PM',
        'Drink packaged juices or cold drinks',
        'Stay inactive for more than 2 hours',
        'Sleep immediately after eating',
    ],
    'lifestyle_tips' => [
        ['Morning Ritual', 'Start your day with warm Methi water. Do light stretching for 5 minutes before your walk. Walk in natural morning sunlight for best results.'],
        ['Sleep & Recovery', 'Sleep by 10:30 PM. Avoid screens at least 1 hour before bed. No heavy meals after 7:00 PM. Quality sleep directly supports fat loss.'],
        ['Eating Mindfully', 'Always sit and eat. No television or phone during meals. Chew slowly. Stop eating when you feel 80% full — not completely stuffed.'],
        ['Stress Management', 'High stress raises cortisol which blocks fat loss. Practice 10 minutes of deep breathing or light meditation daily after your walk.'],
    ],
];
