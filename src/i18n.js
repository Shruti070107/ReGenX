/**
 * @fileoverview ReGenX Multi-lingual Translation and Internationalization System
 * Provides instant dynamic translations for English, Hindi, Telugu, and German.
 * Integrates a MutationObserver to automatically translate dynamic UI changes.
 */

window.currentLanguage = localStorage.getItem('regenx-lang') || 'en';

window.i18nDictionary = {
  // Auth Screen / Registration
  "🌿ReGenX": { hi: "🌿रीजेनएक्स", te: "🌿రీజెన్ఎక్స్", de: "🌿ReGenX" },
  "ReGenX": { hi: "रीजेनएक्स", te: "రీజెన్ఎక్స్", de: "ReGenX" },
  "Smart circular bio-waste logistics": {
    hi: "स्मार्ट चक्रीय जैव-कचरा रसद",
    te: "స్మార్ట్ బయో-వేస్ట్ లాజిస్టిక్స్",
    de: "Intelligente zirkuläre Bioabfall-Logistik"
  },
  "Login": { hi: "लॉगिन", te: "లాగిన్", de: "Anmelden" },
  "Register": { hi: "पंजीकरण", te: "రిజిస్టర్", de: "Registrieren" },
  "I am a...": { hi: "मैं एक हूँ...", te: "నేను ఒక...", de: "Ich bin ein..." },
  "Provider": { hi: "प्रदाता", te: "సరఫరాదారు", de: "Entsorger" },
  "Rider": { hi: "राइडर", te: "రైడర్", de: "Fahrer" },
  "Plant": { hi: "संयंत्र", te: "ప్లాంట్", de: "Anlage" },
  "Full Name": { hi: "पूरा नाम", te: "పూర్తి పేరు", de: "Vollständiger Name" },
  "Organisation / Entity Name": { hi: "संगठन / इकाई का नाम", te: "సంస్థ పేరు", de: "Organisation / Firmenname" },
  "Location (Search or GPS)": { hi: "स्थान (खोज या जीपीएस)", te: "స్థానం (సెర్చ్ లేదా GPS)", de: "Standort (Suche oder GPS)" },
  "Auto-Detect GPS": { hi: "ऑटो-डिटेक्ट जीपीएस", te: "ఆటో-డిటెక్ట్ GPS", de: "GPS automatisch erkennen" },
  "Create Account": { hi: "खाता बनाएं", te: "ఖాతా సృష్టించండి", de: "Konto erstellen" },
  "Enter Dashboard": { hi: "डैशबोर्ड में प्रवेश करें", te: "డాష్‌బోర్డ్ లోనికి ప్రవేశించండి", de: "Dashboard öffnen" },
  "Reset All App Data": { hi: "सभी ऐप डेटा रीसेट करें", te: "అన్ని యాప్ డేటాను రీసెట్ చేయి", de: "Alle App-Daten zurücksetzen" },
  "Account Created!": { hi: "खाता बन गया!", te: "ఖాతా సృష్టించబడింది!", de: "Konto erstellt!" },
  "Welcome to ReGenX. Redirecting you...": { hi: "रीजेनएक्स में आपका स्वागत है। पुनर्निर्देशित किया जा रहा है...", te: "రీజెన్ఎక్స్ కు స్వాగతం. మళ్లిస్తున్నాము...", de: "Willkommen bei ReGenX. Weiterleitung..." },

  // Sidebar Nav Links
  "Overview": { hi: "अवलोकन", te: "అవలోకనం", de: "Übersicht" },
  "Dispatch Request": { hi: "पिकअप अनुरोध", te: "అభ్యర్థన పంపండి", de: "Abholauftrag" },
  "IoT Sensory Bins": { hi: "आईओटी संवेदी डिब्बे", te: "IoT సెన్సరీ బిన్స్", de: "Smarte IoT-Abfallbehälter" },
  "Weekly Records": { hi: "साप्ताहिक रिकॉर्ड", te: "వారపు రికార్డులు", de: "Wöchentliche Berichte" },
  "Monthly Records": { hi: "मासिक रिकॉर्ड", te: "నెలవారీ రికార్డులు", de: "Monatliche Berichte" },
  "Compliance Center": { hi: "अनुपालन केंद्र", te: "అనువర్తన కేంద్రం", de: "Compliance-Zentrum" },
  "Reconciliation": { hi: "सुलह", te: "సయోధ్య", de: "Abgleich" },
  "SLA Monitor": { hi: "एसएलए मॉनिटर", te: "SLA మానిటర్", de: "SLA-Überwachung" },
  "Energy Scorecard": { hi: "ऊर्जा स्कोरकार्ड", te: "ఎनरジー స్కోర్‌కార్డ్", de: "Energie-Scorecard" },
  "Sensor Reliability": { hi: "सेंसर विश्वसनीयता", te: "సెన్సార్ విశ్వసనీయత", de: "Sensorzuverlässigkeit" },
  "Emissions Tracker": { hi: "उत्सर्जन ट्रैकर", te: "ఉద్గారాల ట్రాకర్", de: "Emissions-Tracker" },
  "Quality Index": { hi: "गुणवत्ता सूचकांक", te: "నాణ్యత సూచిక", de: "Qualitätsindex" },
  "Automation Pipeline": { hi: "स्वचालन पाइपलाइन", te: "ఆటోమేషన్ పైప్‌లైన్", de: "Automatisierungs-Pipeline" },
  "Sustainability Hub": { hi: "स्थिरता केंद्र", te: "సస్టైనబిలిటీ హబ్", de: "Nachhaltigkeits-Hub" },
  "Sustainability Report Hub": { hi: "स्थिरता रिपोर्ट हब", te: "సస్టైనబిలిటీ రిపోర్ట్ హబ్", de: "Nachhaltigkeitsbericht-Hub" },
  "ReGen Exchange": { hi: "रीजेन एक्सचेंज", te: "రీజెన్ ఎక్స్ఛేంజ్", de: "ReGen-Börse" },
  "Public Verification": { hi: "सार्वजनिक सत्यापन", te: "పబ్लिक వెరిఫికేషన్", de: "Öffentliche Überprüfung" },
  "Available Jobs": { hi: "उपलब्ध नौकरियां", te: "అందుబాటులో ఉన్న ఉద్యోగాలు", de: "Verfügbare Aufträge" },
  "Completions": { hi: "पूर्णता", te: "పూర్తయినవి", de: "Fertigstellungen" },
  "Incoming Flow": { hi: "आने वाला प्रवाह", te: "ఇన్‌కమింగ్ ఫ్లో", de: "Eingehender Fluss" },
  "Log Output": { hi: "लॉग आउटपुट", te: "లాగ్ అవుట్‌పుట్", de: "Protokollausgabe" },
  "Toggle Theme": { hi: "थीम बदलें", te: "థీమ్ మార్చండి", de: "Design umschalten" },
  "Logout": { hi: "लॉगआउट", te: "లాగ్అవుట్", de: "Abmelden" },

  // Stats Card Titles & Details
  "Total Requests": { hi: "कुल अनुरोध", te: "మొత్తం అభ్యర్థనలు", de: "Gesamtanträge" },
  "Kg Recycled": { hi: "कुल प्रसंस्कृत किग्रा", te: "రీసైకిल చేసిన కిలోలు", de: "Recycelt (in kg)" },
  "CO₂ Offset (kg)": { hi: "CO₂ ऑफसेट (किग्रा)", te: "CO₂ ఆఫ్‌సెట్ (కిలోలు)", de: "CO2-Kompensation (in kg)" },
  "Bins Critical": { hi: "गंभीर डिब्बे", te: "బిన్స్ క్రిటికల్", de: "Kritische Behälter" },
  "No data": { hi: "कोई डेटा नहीं", te: "డేటా లేదు", de: "Keine Daten" },
  "Active": { hi: "सक्रिय", te: "యాక్టివ్", de: "Aktiv" },
  "Warning": { hi: "चेतावनी", te: "హెచ్చరిక", de: "Warnung" },
  "Idle": { hi: "निष्क्रिय", te: "ఖాళీగా ఉంది", de: "Inaktiv" },

  // Stats Card Descriptions
  "No dispatch requests have been created yet.": { hi: "अभी तक कोई पिकअप अनुरोध नहीं बनाया गया है।", te: "ఇంకా ఎలాంటి అభ్యర్థనలు సృష్టించబడలేదు.", de: "Bisher wurden keine Abholaufträge erstellt." },
  "Dispatch requests tracked in the system.": { hi: "सिस्टम में ट्रैक किए गए पिकअप अनुरोध।", te: "సిస్టమ్‌లో ట్రాక్ చేయబడిన అభ్యర్థనలు.", de: "Im System erfasste Abholaufträge." },
  "No material has been processed yet.": { hi: "अभी तक किसी सामग्री का प्रसंस्करण नहीं किया गया है।", te: "ఇंకా ఎలాంటి వ్యర్థాలు ప్రాసెస్ చేయబడలేదు.", de: "Es wurde noch kein Material verarbeitet." },
  "Recovered material captured from completed loads.": { hi: "पूर्ण किए गए भार से प्राप्त प्रसंस्कृत सामग्री।", te: "పూర్తయిన లోడ్ల నుండి సేకరించిన వ్యర్థాలు.", de: "Aus abgeschlossenen Ladungen rückgewonnenes Material." },
  "No offset can be calculated until loads are processed.": { hi: "लोड संसाधित होने तक कोई ऑफसेट गणना नहीं की जा सकती।", te: "వ్యర్థాలు ప్రాసెస్ అయ్యేంతవరకు ఆఫ్‌సెట్ లెక్కించబడదు.", de: "Kompensation kann erst nach Verarbeitung berechnet werden." },
  "Estimated emissions avoided from recovered waste.": { hi: "पुनर्प्राप्त कचरे से बचा हुआ अनुमानित उत्सर्जन।", te: "సేకరించిన వ్యర్థాల నుండి నివారించబడిన ఉద్గారాలు.", de: "Vermiedene Emissionen durch verwerteten Abfall (geschätzt)." },
  "No IoT bins are connected yet.": { hi: "अभी तक कोई आईओटी डिब्बे नहीं जुड़े हैं।", te: "ఇంకా ఏ IoT బిన్స్ కనెక్ట్ చేయబడలేదు.", de: "Bisher sind keine smarten Behälter verbunden." },
  "Connected bins above the critical fill threshold.": { hi: "महत्वपूर्ण सीमा से ऊपर भरे हुए जुड़े डिब्बे।", te: "క్రిటికల్ పరిమితి కంటే ఎక్కువ నిండిన బిన్స్.", de: "Verbundene Behälter über dem kritischen Füllstand." },
  "Open bins": { hi: "डिब्बे खोलें", te: "బిన్స్ ఓపెన్ చేయండి", de: "Behälter öffnen" },

  // Public Trust Index
  "Public Trust Index": { hi: "सार्वजनिक विश्वास सूचकांक", te: "పబ్లిక్ ట్రస్ట్ ఇండెక్స్", de: "Öffentlicher Vertrauensindex" },
  "No verified orders have been recorded yet.": { hi: "अभी तक कोई सत्यापित ऑर्डर रिकॉर्ड नहीं किया गया है।", te: "ఇంకా ఎలాంటి ఆర్డర్లు రికార్డు కాలेదు.", de: "Bisher wurden keine verifizierten Aufträge erfasst." },
  "Integrity scoring will appear once dispatch events are written to the ledger.": {
    hi: "बहीखाते में पिकअप घटनाएं लिखे जाने के बाद अखंडता स्कोरिंग दिखाई देगी।",
    te: "లెడ్జర్‌లో రికార్డ్ రాగానే ఇంటెగ్రిటీ స్కోరింగ్ కనిపిస్తుంది.",
    de: "Vertrauenswert wird angezeigt, sobald Abholungen im Register erfasst sind."
  },

  // Compliance Radar & Alerts
  "COMPLIANCE RADAR": { hi: "अनुपालन रडार", te: "అనువర్తన రాడార్", de: "COMPLIANCE-RADAR" },
  "No compliance alerts": { hi: "कोई अनुपालन अलर्ट नहीं", te: "ఎలాंటి అనువర్తన హెచ్చరికలు లేవు", de: "Keine Compliance-Warnungen" },
  "0 active alerts": { hi: "0 सक्रिय अलर्ट", te: "0 యాక్టివ్ అలర్ట్‌లు", de: "0 aktive Warnungen" },

  // Ticker Feed messages
  "AI Route Optimization Active. Saving 12% Fuel Fleet-wide.": {
    hi: "एआई मार्ग अनुकूलन सक्रिय। पूरे बेड़े में 12% ईंधन की बचत।",
    te: "AI రూట్ ఆప్టిమైజేషన్ యాక్టివ్. ఫ్లీట్ వ్యాప్తంగా 12% ఇంధనం ఆదా అవుతోంది.",
    de: "AI-Routenoptimierung aktiv. Flottenweit 12% Treibstoff gespart."
  },
  "Plant Alpha just minted 250 $RGX for organic compost yield.": {
    hi: "संयंत्र अल्फा ने जैविक खाद उपज के लिए 250 $RGX बनाए।",
    te: "ప్లాంట్ ఆల్ఫా ఇప్పుడే సేంద్రీయ కంపోస్ట్ దిగుబడి కోసం 250 $RGX మింట్ చేసింది.",
    de: "Anlage Alpha hat soeben 250 $RGX für organischen Kompostertrag geprägt."
  },
  "Over 5,000kg of biowaste diverted from landfills today.": {
    hi: "आज 5,000 किलोग्राम से अधिक जैव-कचरा लैंडफिल से हटाया गया।",
    te: "ఈరోజు ల్యాండ్‌ఫిల్స్ నుండి 5,000 కిలోల కంటే ఎక్కువ బయో-వేస్ట్ మళ్లించబడింది.",
    de: "Heute über 5.000 kg Bioabfall von Deponien umgeleitet."
  },

  // Dynamic placeholders & lists
  "No active dispatches": { hi: "कोई सक्रिय पिकअप नहीं", te: "ఎలాంటి యాక్టివ్ పికప్‌లు లేవు", de: "Keine aktiven Abholungen" },
  "There are no in-flight provider orders right now.": { hi: "इस समय कोई इन-फ़्लाइट प्रदाता ऑर्डर नहीं हैं।", te: "ప్రస్తుతం ఎలాంటి ఆర్డర్లు లేవు.", de: "Aktuell gibt es keine aktiven Aufträge." },
  "Create a dispatch request to populate this section.": { hi: "इस अनुभाग को भरने के लिए एक पिकअप अनुरोध बनाएं।", te: "ఈ విభాగాన్ని నింపడానికి అభ్యర్థన సృష్టించండి.", de: "Erstellen Sie einen Abholauftrag, um diesen Bereich zu füllen." },
  "The Green Wall": { hi: "द ग्रीन वॉल", te: "ది గ్రీన్ వాల్", de: "Die Grüne Wand" },
  "No network activity yet. Complete a pickup to appear here!": {
    hi: "अभी तक कोई नेटवर्क गतिविधि नहीं है। यहाँ दिखाई देने के लिए एक पिकअप पूरा करें!",
    te: "ఇంకా నెట్‌వర్క్ కార్యాచరణ లేదు. ఇక్కడ కనిపించడానికి పికప్‌ని పూర్తి చేయండి!",
    de: "Noch keine Netzwerkaktivität. Schließen Sie eine Abholung ab, um hier zu erscheinen!"
  },
  "System Overview": { hi: "सिस्टम अवलोकन", te: "సిస్టమ్ అవలోకనం", de: "Systemübersicht" },
  "Active Log": { hi: "सक्रिय लॉग", te: "యాక్టివ్ లాగ్", de: "Aktivitätsprotokoll" },
  "Public Audits": { hi: "सार्वजनिक ऑडिट", te: "పబ్లిక్ ఆడిట్", de: "Öffentliche Audits" },
  "Verify Data": { hi: "डेटा सत्यापित करें", te: "డేటాను ధృవీకరించు", de: "Daten verifizieren" },
  "Compliance Rating": { hi: "अनुपालन रेटिंग", te: "అనువర్తన రేటింగ్", de: "Compliance-Bewertung" },
  "Wallet Balance": { hi: "वॉलेट बैलेंस", te: "వాలెట్ బ్యాలెన్స్", de: "Guthaben" },
  "Staked for Environment": { hi: "पर्यावरण के लिए स्टेक किया गया", te: "పర్యావరణం కోసం స్టేక్ చేసినవి", de: "Für die Umwelt gestakt" },
  "DeFi Carbon Exchange Hub": { hi: "डेफी कार्बन एक्सचेंज हब", te: "DeFi కార్బన్ ఎక్స్ఛేంజ్ హబ్", de: "DeFi Carbon Exchange Hub" },
  "Network TVL": { hi: "नेटवर्क टीवीएल", te: "నెట్‌వర్క్ TVL", de: "Netzwerk-TVL" },
  "Stake for Environment": { hi: "पर्यावरण के लिए स्टेक करें", te: "పర్యావరణం కోసం స్టేక్ చేయండి", de: "Für die Umwelt staken" },
  "Global Impact Crowdfunding": { hi: "वैश्विक प्रभाव क्राउडफंडिंग", te: "గ్లోబల్ ఇంపాక్ట్ క్రౌడ్‌ఫండింగ్", de: "Globales Impact Crowdfunding" },
  "Amazon Reforestation Initiative": { hi: "अमेज़न वनीकरण पहल", te: "అమేజాన్ రీఫారెస్టేషన్ इनिशिएटिव", de: "Amazon Reforestation Initiative" },
  "Goal": { hi: "लक्ष्य", te: "లక్ష్యం", de: "Ziel" },
  "Fund with 500 $RGX": { hi: "500 $RGX के साथ फंड करें", te: "500 $RGX తో ఫండ్ చేయండి", de: "Mit 500 $RGX unterstützen" },

  // General UI Words & Controls
  "Submit": { hi: "जमा करें", te: "సమర్పించు", de: "Absenden" },
  "Save": { hi: "सहेजें", te: "సేవ్ చేయి", de: "Speichern" },
  "Close": { hi: "बंद करें", te: "మూసివేయి", de: "Schließen" },
  "Cancel": { hi: "रद्द करें", te: "రద్దు చేయి", de: "Abbrechen" },
  "Search": { hi: "खोजें", te: "వెతకండి", de: "Suchen" },
  "Add": { hi: "जोड़ें", te: "జోడించు", de: "Hinzufügen" },
  "Download": { hi: "डाउनलोड", te: "డౌన్‌లోడ్", de: "Herunterladen" },
  "Generate Report": { hi: "रिपोर्ट जनरेट करें", te: "निवेదికను సృష్టించు", de: "Bericht erstellen" },
  "Generate PDF": { hi: "पीडीएफ बनाएं", te: "PDF సృష్టించు", de: "PDF erstellen" },
  "Notifications": { hi: "सूचनाएं", te: "నోటిఫికేషన్‌లు", de: "Benachrichtigungen" },
  "Activity Center": { hi: "गतिविधि केंद्र", te: "యాక్టివిటీ సెంటర్", de: "Aktivitätscenter" },
  "System Status": { hi: "सिस्टम स्थिति", te: "సిస్టమ్ స్థితి", de: "Systemstatus" },
  "Online": { hi: "ऑनलाइन", te: "ఆన్‌లైన్", de: "Online" },
  "Offline": { hi: "ऑफ़लाइन", te: "ఆఫ్‌లైన్", de: "Offline" },
  "Mark all read": { hi: "सभी पढ़े हुए के रूप में चिह्नित करें", te: "అన్నీ చదివినట్లు మార్క్ చేయి", de: "Alle als gelesen markieren" },
  "All activity synced": { hi: "सभी गतिविधि सिंक हो गई", te: "అన్ని కార్యకలాపాలు సమకాలీకరించబడ్డాయి", de: "Alle Aktivitäten synchronisiert" },
  "System initializing...": { hi: "प्रणाली प्रारंभ हो रही है...", te: "సిస్టమ్ ప్రారంభమవుతోంది...", de: "System wird initialisiert..." },
  "Local Mode": { hi: "स्थानीय मोड", te: "లోకల్ మోడ్", de: "Lokaler Modus" },
  "LOCAL MODE": { hi: "स्थानीय मोड", te: "లోకल మోడ్", de: "LOKALER MODUS" }
};

/**
 * Translates a single string based on the active language.
 * @param {string} text - The source text.
 * @param {string} lang - The target language ('en', 'hi', 'te', 'de').
 * @returns {string}
 */
window.translateText = function(text, lang) {
  if (!text) return "";
  const cleaned = text.trim();
  if (cleaned.length === 0) return text;

  const dict = window.i18nDictionary;
  if (!dict || lang === 'en') return text;

  // 1. Exact Match
  if (dict[cleaned] && dict[cleaned][lang]) {
    return dict[cleaned][lang];
  }

  // 2. Case-insensitive Match
  const lowerText = cleaned.toLowerCase();
  for (const key in dict) {
    if (key.toLowerCase() === lowerText && dict[key][lang]) {
      return dict[key][lang];
    }
  }

  // 3. Dynamic Phrase Sub-replacements
  let translated = text;

  const phraseReplacements = {
    "Kg Recycled": { hi: "किग्रा पुनर्चक्रित", te: "రీసైకిల్ చేసిన కిలోలు", de: "Kg Recycelt" },
    "CO₂ Offset (kg)": { hi: "CO₂ ऑफसेट (किग्रा)", te: "CO₂ ఆఫ్‌సెట్ (కిలోలు)", de: "CO2-Kompensation (in kg)" },
    "active alerts": { hi: "सक्रिय अलर्ट", te: "యాక్టివ్ అలర్ట్‌లు", de: "aktive Warnungen" },
    "alerts": { hi: "अलर्ट", te: "హెच्चరికలు", de: "Warnungen" },
    "BINS CRITICAL": { hi: "गंभीर डिब्बे", te: "బిన్స్ క్రిటికल", de: "BEHÄLTER KRITISCH" },
    "diverted": { hi: "मोड़ दिया", te: "మళ్లించారు", de: "umgeleitet" },
    "kg of waste": { hi: "किग्रा कचरा", te: "కిలోల వ్యర్థాలు", de: "kg Abfall" },
    "kg": { hi: "किग्रा", te: "కిలోలు", de: "kg" },
    "tons": { hi: "टन", te: "టన్నులు", de: "Tonnen" },
    "of waste": { hi: "कचरा", te: "వ్యర్థాలు", de: "Abfall" },
    "processed": { hi: "प्रसंस्कृत", te: "ప్రాసెస్ చేయబడింది", de: "verarbeitet" },
    "active": { hi: "सक्रिय", te: "యాక్టివ్", de: "aktiv" },
    "pending": { hi: "लंबित", te: "పెండింగ్", de: "ausstehend" },
    "completed": { hi: "पूरा किया", te: "పూర్తయింది", de: "abgeschlossen" },
    "Rider Assigned": { hi: "राइडर असाइन किया गया", te: "రైడర్ కేటాయించబడింది", de: "Fahrer zugewiesen" },
  };

  for (const key in phraseReplacements) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    if (regex.test(translated) && phraseReplacements[key][lang]) {
      translated = translated.replace(regex, phraseReplacements[key][lang]);
    }
  }

  return translated;
};

/**
 * Traverses the DOM recursively to translate all visible labels and text nodes.
 * @param {Node} root - The root node to start traversal.
 */
window.translateDOM = function(root = document.body) {
  const lang = window.currentLanguage || 'en';
  if (lang === 'en') return;

  const walk = (node) => {
    // 1. Element Node attributes translation
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre') return;

      ['placeholder', 'title', 'aria-label'].forEach(attr => {
        if (node.hasAttribute(attr)) {
          const original = node.getAttribute(attr);
          const val = window.translateText(original, lang);
          if (val !== original) {
            node.setAttribute(attr, val);
          }
        }
      });
    }

    // 2. Text Node value translation
    if (node.nodeType === Node.TEXT_NODE) {
      const originalText = node.nodeValue;
      if (originalText && originalText.trim().length > 0) {
        const trimmed = originalText.trim();
        const val = window.translateText(trimmed, lang);
        if (val !== trimmed) {
          const leading = originalText.match(/^\s*/)[0];
          const trailing = originalText.match(/\s*$/)[0];
          node.nodeValue = leading + val + trailing;
        }
      }
    }

    // Traverse Child Nodes
    for (let child = node.firstChild; child; child = child.nextSibling) {
      walk(child);
    }
  };

  walk(root);
};

// MUTATION OBSERVER FOR DYNAMIC DATA INJECTIONS
let i18nObserver = null;

window.startI18nObserver = function() {
  if (i18nObserver) i18nObserver.disconnect();

  const lang = window.currentLanguage || 'en';
  if (lang === 'en') return;

  i18nObserver = new MutationObserver((mutations) => {
    // Disconnect temporarily to prevent infinite loop on node value edits
    i18nObserver.disconnect();

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        window.translateDOM(node);
      });
      if (mutation.type === 'characterData') {
        const cleaned = mutation.target.nodeValue.trim();
        const val = window.translateText(cleaned, lang);
        if (val !== cleaned) {
          mutation.target.nodeValue = val;
        }
      }
    });

    // Reconnect
    i18nObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });

  i18nObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
};

// LANGUAGE CONTROLLER
window.setLanguage = function(lang) {
  window.currentLanguage = lang;
  localStorage.setItem('regenx-lang', lang);
  
  // Instant dynamic translation
  if (lang !== 'en') {
    window.translateDOM();
    window.startI18nObserver();
  }
  
  // Reload page to refresh all static variables, charts, and maps with the active locale state
  window.location.reload();
};

// DOM ready listener setup
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('app-language-select');
  if (select) {
    select.value = window.currentLanguage;
  }

  if (window.currentLanguage !== 'en') {
    window.translateDOM();
    window.startI18nObserver();
  }
});
