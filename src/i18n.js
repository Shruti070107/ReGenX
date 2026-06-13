/**
 * @fileoverview ReGenX Multi-lingual Translation and Internationalization System
 * Provides instant dynamic translations for English, Hindi, Spanish, and French.
 * Integrates a MutationObserver to automatically translate dynamic UI changes.
 */

window.currentLanguage = localStorage.getItem('regenx-lang') || 'en';

window.i18nDictionary = {
  // Auth Screen / Registration
  "🌿ReGenX": { hi: "🌿रीजेनएक्स", es: "🌿ReGenX", fr: "🌿ReGenX" },
  "ReGenX": { hi: "रीजेनएक्स", es: "ReGenX", fr: "ReGenX" },
  "Smart circular bio-waste logistics": {
    hi: "स्मार्ट चक्रीय जैव-कचरा रसद",
    es: "Logística circular inteligente de biorresiduos",
    fr: "Logistique circulaire intelligente des biodéchets"
  },
  "Login": { hi: "लॉगिन", es: "Iniciar sesión", fr: "Connexion" },
  "Register": { hi: "पंजीकरण", es: "Registrarse", fr: "S'inscrire" },
  "I am a...": { hi: "मैं एक हूँ...", es: "Soy un...", fr: "Je suis un..." },
  "Provider": { hi: "प्रदाता", es: "Proveedor", fr: "Fournisseur" },
  "Rider": { hi: "राइडर", es: "Transportista", fr: "Collecteur" },
  "Plant": { hi: "संयंत्र", es: "Planta", fr: "Usine" },
  "Full Name": { hi: "पूरा नाम", es: "Nombre completo", fr: "Nom complet" },
  "Organisation / Entity Name": { hi: "संगठन / इकाई का नाम", es: "Nombre de la organización", fr: "Nom de l'organisation" },
  "Location (Search or GPS)": { hi: "स्थान (खोज या जीपीएस)", es: "Ubicación (Búsqueda o GPS)", fr: "Localisation (Recherche ou GPS)" },
  "Auto-Detect GPS": { hi: "ऑटो-डिटेक्ट जीपीएस", es: "Autodetectar GPS", fr: "Détecter le GPS" },
  "Create Account": { hi: "खाता बनाएं", es: "Crear cuenta", fr: "Créer un compte" },
  "Enter Dashboard": { hi: "डैशबोर्ड में प्रवेश करें", es: "Entrar al panel", fr: "Accéder au tableau de bord" },
  "Reset All App Data": { hi: "सभी ऐप डेटा रीसेट करें", es: "Restablecer todos los datos", fr: "Réinitialiser les données" },
  "Account Created!": { hi: "खाta बन गया!", es: "¡Cuenta creada!", fr: "Compte créé !" },
  "Welcome to ReGenX. Redirecting you...": { hi: "रीजेनएक्स में आपका स्वागत है। पुनर्निर्देशित किया जा रहा है...", es: "Bienvenido a ReGenX. Redirigiendo...", fr: "Bienvenue sur ReGenX. Redirection..." },

  // Sidebar Nav Links
  "Overview": { hi: "अवलोकन", es: "Vista general", fr: "Vue d'ensemble" },
  "Dispatch Request": { hi: "पिकअप अनुरोध", es: "Solicitar recogida", fr: "Demande de collecte" },
  "IoT Sensory Bins": { hi: "आईओटी संवेदी डिब्बे", es: "Contenedores IoT", fr: "Bacs connectés IoT" },
  "Weekly Records": { hi: "साप्ताहिक रिकॉर्ड", es: "Registros semanales", fr: "Rapports hebdomadaires" },
  "Monthly Records": { hi: "मासिक रिकॉर्ड", es: "Registros mensuales", fr: "Rapports mensuels" },
  "Compliance Center": { hi: "अनुपालन केंद्र", es: "Centro de cumplimiento", fr: "Centre de conformité" },
  "Reconciliation": { hi: "सुलह", es: "Reconciliación", fr: "Réconciliation" },
  "SLA Monitor": { hi: "एसएलए मॉनिटर", es: "Monitor de SLA", fr: "Moniteur SLA" },
  "Energy Scorecard": { hi: "ऊर्जा स्कोरकार्ड", es: "Tarjeta de energía", fr: "Fiche énergétique" },
  "Sensor Reliability": { hi: "सेंसर विश्वसनीयता", es: "Fiabilidad del sensor", fr: "Fiabilité des capteurs" },
  "Emissions Tracker": { hi: "उत्सर्जन ट्रैकर", es: "Rastreador de emisiones", fr: "Suivi des émissions" },
  "Quality Index": { hi: "गुणवत्ता सूचकांक", es: "Índice de calidad", fr: "Indice de qualité" },
  "Automation Pipeline": { hi: "स्वचालन पाइपलाइन", es: "Canalización automatizada", fr: "Pipeline d'automatisation" },
  "Sustainability Hub": { hi: "स्थिरता केंद्र", es: "Portal de sostenibilidad", fr: "Hub de durabilité" },
  "Sustainability Report Hub": { hi: "स्थिरता रिपोर्ट हब", es: "Centro de informes de sostenibilidad", fr: "Hub rapports de durabilité" },
  "ReGen Exchange": { hi: "रीजेन एक्सचेंज", es: "Bolsa ReGen", fr: "Échange ReGen" },
  "Public Verification": { hi: "सार्वजनिक सत्यापन", es: "Verificación pública", fr: "Vérification publique" },
  "Available Jobs": { hi: "उपलब्ध नौकरियां", es: "Trabajos disponibles", fr: "Tâches disponibles" },
  "Completions": { hi: "पूर्णता", es: "Completados", fr: "Terminés" },
  "Incoming Flow": { hi: "आने वाला प्रवाह", es: "Flujo entrante", fr: "Flux entrant" },
  "Log Output": { hi: "लॉग आउटपुट", es: "Registrar producción", fr: "Enregistrer la production" },
  "Toggle Theme": { hi: "थीम बदलें", es: "Cambiar tema", fr: "Changer de thème" },
  "Logout": { hi: "लॉगआउट", es: "Cerrar sesión", fr: "Déconnexion" },

  // Stats Card Titles & Details
  "Total Requests": { hi: "कुल अनुरोध", es: "Total solicitudes", fr: "Total des demandes" },
  "Kg Recycled": { hi: "कुल प्रसंस्कृत किग्रा", es: "Kg reciclados", fr: "Kg recyclés" },
  "CO₂ Offset (kg)": { hi: "CO₂ ऑफसेट (किग्रा)", es: "CO₂ compensado (kg)", fr: "CO₂ compensé (kg)" },
  "Bins Critical": { hi: "गंभीर डिब्बे", es: "Contenedores críticos", fr: "Bacs critiques" },
  "No data": { hi: "कोई डेटा नहीं", es: "Sin datos", fr: "Pas de données" },
  "Active": { hi: "सक्रिय", es: "Activo", fr: "Actif" },
  "Warning": { hi: "चेतावनी", es: "Advertencia", fr: "Avertissement" },
  "Idle": { hi: "निष्क्रिय", es: "Inactivo", fr: "Inactif" },

  // Stats Card Descriptions
  "No dispatch requests have been created yet.": { hi: "अभी तक कोई पिकअप अनुरोध नहीं बनाया गया है।", es: "No se han creado solicitudes de envío aún.", fr: "Aucune demande d'envoi n'a encore été créée." },
  "Dispatch requests tracked in the system.": { hi: "सिस्टम में ट्रैक किए गए पिकअप अनुरोध।", es: "Solicitudes de envío rastreadas en el sistema.", fr: "Demandes d'envoi suivies dans le système." },
  "No material has been processed yet.": { hi: "अभी तक किसी सामग्री का प्रसंस्करण नहीं किया गया है।", es: "No se ha procesado ningún material aún.", fr: "Aucun matériau n'a encore été traité." },
  "Recovered material captured from completed loads.": { hi: "पूर्ण किए गए भार से प्राप्त प्रसंस्कृत सामग्री।", es: "Material recuperado capturado de cargas completadas.", fr: "Matériau récupéré à partir de charges terminées." },
  "No offset can be calculated until loads are processed.": { hi: "लोड संसाधित होने तक कोई ऑफसेट गणना नहीं की जा सकती।", es: "No se puede calcular la compensación hasta que se procesen las cargas.", fr: "Aucune compensation ne peut être calculée tant que les charges ne sont pas traitées." },
  "Estimated emissions avoided from recovered waste.": { hi: "पुनर्प्राप्त कचरे से बचा हुआ अनुमानित उत्सर्जन।", es: "Emisiones estimadas evitadas a partir de residuos recuperados.", fr: "Émissions estimées évitées à partir des déchets récupérés." },
  "No IoT bins are connected yet.": { hi: "अभी तक कोई आईओटी डिब्बे नहीं जुड़े हैं।", es: "No hay contenedores IoT conectados aún.", fr: "Aucun bac IoT n'est encore connecté." },
  "Connected bins above the critical fill threshold.": { hi: "महत्वपूर्ण सीमा से ऊपर भरे हुए जुड़े डिब्बे।", es: "Contenedores conectados por encima del umbral crítico.", fr: "Bacs connectés au-dessus du seuil critique de remplissage." },
  "Open bins": { hi: "डिब्बे खोलें", es: "Contenedores abiertos", fr: "Ouvrir les bacs" },

  // Public Trust Index
  "Public Trust Index": { hi: "सार्वजनिक विश्वास सूचकांक", es: "Índice de confianza pública", fr: "Indice de confiance publique" },
  "No verified orders have been recorded yet.": { hi: "अभी तक कोई सत्यापित ऑर्डर रिकॉर्ड नहीं किया गया है।", es: "No se han registrado pedidos verificados aún.", fr: "Aucune commande vérifiée n'a encore été enregistrée." },
  "Integrity scoring will appear once dispatch events are written to the ledger.": {
    hi: "बहीखाते में पिकअप घटनाएं लिखे जाने के बाद अखंडता स्कोरिंग दिखाई देगी।",
    es: "La puntuación de integridad aparecerá una vez que los eventos de envío se registren.",
    fr: "Le score d'intégrité apparaîtra une fois les collectes enregistrées."
  },

  // Compliance Radar & Alerts
  "COMPLIANCE RADAR": { hi: "अनुपालन रडार", es: "RADAR DE CUMPLIMIENTO", fr: "RADAR DE CONFORMITÉ" },
  "No compliance alerts": { hi: "कोई अनुपालन अलर्ट नहीं", es: "Sin alertas de cumplimiento", fr: "Aucune alerte de conformité" },
  "0 active alerts": { hi: "0 सक्रिय अलर्ट", es: "0 alertas activas", fr: "0 alerte active" },

  // Ticker Feed messages
  "AI Route Optimization Active. Saving 12% Fuel Fleet-wide.": {
    hi: "एआई मार्ग अनुकूलन सक्रिय। पूरे बेड़े में 12% ईंधन की बचत।",
    es: "Optimización de rutas por IA activa. Ahorro de 12% de combustible.",
    fr: "Optimisation des itinéraires par IA active. 12% de carburant économisé."
  },
  "Plant Alpha just minted 250 $RGX for organic compost yield.": {
    hi: "संयंत्र अल्फा ने जैविक खाद उपज के लिए 250 $RGX बनाए।",
    es: "Planta Alpha acuñó 250 $RGX por rendimiento de compost orgánico.",
    fr: "L'usine Alpha vient de générer 250 $RGX pour le compost organique."
  },
  "Over 5,000kg of biowaste diverted from landfills today.": {
    hi: "आज 5,000 किलोग्राम से अधिक जैव-कचरा लैंडफिल से हटाया गया।",
    es: "Más de 5,000 kg de biorresiduos desviados de vertederos hoy.",
    fr: "Plus de 5 000 kg de biodéchets détournés des décharges aujourd'hui."
  },

  // Dynamic placeholders & lists
  "No active dispatches": { hi: "कोई सक्रिय पिकअप नहीं", es: "Sin envíos activos", fr: "Aucune collecte active" },
  "There are no in-flight provider orders right now.": { hi: "इस समय कोई इन-फ़्लाइट प्रदाता ऑर्डर नहीं हैं।", es: "No hay pedidos de proveedores en tránsito ahora.", fr: "Aucune commande de fournisseur en cours actuellement." },
  "Create a dispatch request to populate this section.": { hi: "इस अनुभाग को भरने के लिए एक पिकअप अनुरोध बनाएं।", es: "Crea una solicitud de envío para completar esta sección.", fr: "Créez une demande de collecte pour remplir cette section." },
  "The Green Wall": { hi: "द ग्रीन वॉल", es: "El Muro Verde", fr: "Le Mur Vert" },
  "No network activity yet. Complete a pickup to appear here!": {
    hi: "अभी तक कोई नेटवर्क गतिविधि नहीं है। यहाँ दिखाई देने के लिए एक पिकअप पूरा करें!",
    es: "¡Completa una recogida para aparecer aquí!",
    fr: "Complétez une collecte pour apparaître ici !"
  },
  "System Overview": { hi: "सिस्टम अवलोकन", es: "Resumen del sistema", fr: "Aperçu du système" },
  "Active Log": { hi: "सक्रिय लॉग", es: "Registro activo", fr: "Journal d'activité" },
  "Public Audits": { hi: "सार्वजनिक ऑडिट", es: "Auditorías públicas", fr: "Audits publics" },
  "Verify Data": { hi: "डेटा सत्यापित करें", es: "Verificar datos", fr: "Vérifier les données" },
  "Compliance Rating": { hi: "अनुपालन रेटिंग", es: "Calificación de cumplimiento", fr: "Indice de conformité" },
  "Wallet Balance": { hi: "वॉलेट बैलेंस", es: "Saldo de billetera", fr: "Solde du portefeuille" },
  "Staked for Environment": { hi: "पर्यावरण के लिए स्टेक किया गया", es: "Staked por el medio ambiente", fr: "Staké pour l'environnement" },
  "DeFi Carbon Exchange Hub": { hi: "डेफी कार्बन एक्सचेंज हब", es: "Centro de intercambio de carbono DeFi", fr: "Plateforme d'échange de carbone DeFi" },
  "Network TVL": { hi: "नेटवर्क टीवीएल", es: "TVL de la red", fr: "TVL du réseau" },
  "Stake for Environment": { hi: "पर्यावरण के लिए स्टेक करें", es: "Stakear por el medio ambiente", fr: "Staker pour l'environnement" },
  "Global Impact Crowdfunding": { hi: "वैश्विक प्रभाव क्राउडफंडिंग", es: "Crowdfunding de impacto global", fr: "Financement participatif d'impact global" },
  "Amazon Reforestation Initiative": { hi: "अमेज़न वनीकरण पहल", es: "Iniciativa de reforestación de la Amazonia", fr: "Initiative de reboisement d'Amazonie" },
  "Goal": { hi: "लक्ष्य", es: "Meta", fr: "Objectif" },
  "Fund with 500 $RGX": { hi: "500 $RGX के साथ फंड करें", es: "Financiar con 500 $RGX", fr: "Financer avec 500 $RGX" },

  // General UI Words & Controls
  "Submit": { hi: "जमा करें", es: "Enviar", fr: "Soumettre" },
  "Save": { hi: "सहेजें", es: "Guardar", fr: "Sauvegarder" },
  "Close": { hi: "बंद करें", es: "Cerrar", fr: "Fermer" },
  "Cancel": { hi: "रद्द करें", es: "Cancelar", fr: "Annuler" },
  "Search": { hi: "खोजें", es: "Buscar", fr: "Rechercher" },
  "Add": { hi: "जोड़ें", es: "Añadir", fr: "Ajouter" },
  "Download": { hi: "डाउनलोड", es: "Descargar", fr: "Télécharger" },
  "Generate Report": { hi: "रिपोर्ट जनरेट करें", es: "Generar informe", fr: "Générer le rapport" },
  "Generate PDF": { hi: "पीडीएफ बनाएं", es: "Generar PDF", fr: "Générer PDF" },
  "Notifications": { hi: "सूचनाएं", es: "Notificaciones", fr: "Notifications" },
  "Activity Center": { hi: "गतिविधि केंद्र", es: "Centro de actividades", fr: "Centre d'activité" },
  "System Status": { hi: "सिस्टम स्थिति", es: "Estado del sistema", fr: "Statut du système" },
  "Online": { hi: "ऑनलाइन", es: "En línea", fr: "En ligne" },
  "Offline": { hi: "ऑफ़लाइन", es: "Desconectado", fr: "Hors ligne" },
  "Mark all read": { hi: "सभी पढ़े हुए के रूप में चिह्नित करें", es: "Marcar todo como leído", fr: "Tout marquer comme lu" },
  "All activity synced": { hi: "सभी गतिविधि सिंक हो गई", es: "Actividad sincronizada", fr: "Toutes les activités synchronisées" },
  "System initializing...": { hi: "प्रणाली प्रारंभ हो रही है...", es: "Inicializando sistema...", fr: "Initialisation du système..." },
  "Local Mode": { hi: "स्थानीय मोड", es: "Modo local", fr: "Mode local" },
  "LOCAL MODE": { hi: "स्थानीय मोड", es: "MODO LOCAL", fr: "MODE LOCAL" }
};

/**
 * Translates a single string based on the active language.
 * @param {string} text - The source text.
 * @param {string} lang - The target language ('en', 'hi', 'es', 'fr').
 * @returns {string}
 */
window.translateText = function(text, lang) {
  if (!text) return "";
  const activeLang = lang || window.currentLanguage || 'en';
  const cleaned = text.trim();
  if (cleaned.length === 0) return text;

  const dict = window.i18nDictionary;
  if (!dict || activeLang === 'en') return text;

  // 1. Exact Match
  if (dict[cleaned] && dict[cleaned][activeLang]) {
    return dict[cleaned][activeLang];
  }

  // 2. Case-insensitive Match
  const lowerText = cleaned.toLowerCase();
  for (const key in dict) {
    if (key.toLowerCase() === lowerText && dict[key][activeLang]) {
      return dict[key][activeLang];
    }
  }

  // 3. Dynamic Phrase Sub-replacements
  let translated = text;

  const phraseReplacements = {
    "Kg Recycled": { hi: "किग्रा पुनर्चक्रित", es: "Kg reciclados", fr: "Kg recyclés" },
    "CO₂ Offset (kg)": { hi: "CO₂ ऑफसेट (किग्रा)", es: "CO₂ compensado (kg)", fr: "CO₂ compensé (kg)" },
    "active alerts": { hi: "सक्रिय अलर्ट", es: "alertas activas", fr: "alertes actives" },
    "alerts": { hi: "अलर्ट", es: "alertas", fr: "alertes" },
    "BINS CRITICAL": { hi: "गंभीर डिब्बे", es: "CONTENEDORES CRÍTICOS", fr: "BACS CRITIQUES" },
    "diverted": { hi: "मोड़ दिया", es: "desviado", fr: "détourné" },
    "kg of waste": { hi: "किग्रा कचरा", es: "kg de residuos", fr: "kg de déchets" },
    "kg": { hi: "किग्रा", es: "kg", fr: "kg" },
    "tons": { hi: "टन", es: "toneladas", fr: "tonnes" },
    "of waste": { hi: "कचरा", es: "de residuos", fr: "de déchets" },
    "processed": { hi: "प्रसंस्कृत", es: "procesado", fr: "traité" },
    "active": { hi: "सक्रिय", es: "activo", fr: "actif" },
    "pending": { hi: "लंबित", es: "pendiente", fr: "en attente" },
    "completed": { hi: "पूरा किया", es: "completado", fr: "terminé" },
    "Rider Assigned": { hi: "राइडर असाइन किया गया", es: "Transportista asignado", fr: "Collecteur assigné" },
  };

  for (const key in phraseReplacements) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    if (regex.test(translated) && phraseReplacements[key][activeLang]) {
      translated = translated.replace(regex, phraseReplacements[key][activeLang]);
    }
  }

  return translated;
};

/**
 * Traverses the DOM recursively to translate all visible labels and text nodes.
 * @param {Node} [root=document.body] - The root node to start traversal.
 * @returns {void}
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
/**
 * Switches the active UI language and retranslates all visible DOM text.
 * Persists the selection to LocalStorage under the 'regenx-lang' key.
 * @param {string} lang - BCP-47 language code. Supported: 'en', 'hi', 'es', 'fr'.
 * @returns {void}
 */
window.setLanguage = function(lang) {
  const safeLang = (lang || 'en').toLowerCase();
  window.currentLanguage = safeLang;
  localStorage.setItem('regenx-lang', safeLang);
  
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
