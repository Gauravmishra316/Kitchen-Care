/**
 * KitchenCare Localization Engine (English & Hindi)
 */
const translations = {
      en: {
        app_name: "KitchenCare",
        help: "Help",
        alerts: "Alerts",
        logout: "Logout",
        today_at_glance: "Today in Kitchen",
        expiring_soon: "Expiring Soon",
        low_stock: "Low Stock Items",
        fridge_temp: "Cooling Temperature",
        orders_cooking: "Cooking in Progress",
        add_stock: "Add New Stock",
        stock_list: "Stock List",
        recipes: "Recipes & Menus",
        wastage: "Log Wastage",
        stock_count: "Stock Count",
        temp_log: "Temperature Log",
        checklists: "Hygiene Checklists",
        my_orders: "Kitchen Orders",
        take_order: "Take Order",
        active_orders: "Active Orders",
        dashboard: "Admin Dashboard",
        chef_perf: "Chef Performance",
        activity_log: "Audit Log",
        reports: "Reports & CSV",
        settings: "Settings & Users",
        start_cooking: "Start Cooking",
        mark_ready: "Mark as Ready",
        report_problem: "Report Problem",
        send_kitchen: "Send to Kitchen",
        confirm_order: "Review & Send",
        out_of_stock: "Not Available Today",
        allergies_q: "Any Allergy?",
        yes: "Yes",
        no: "No",
        fresh: "Fresh",
        use_soon: "Use Soon (<= 3d)",
        expired: "Expired",
        save: "Save",
        cancel: "Cancel",
        view_action: "Review",
        confirm: "Confirm",
        fefo_used: "Auto-deducted oldest batch (FEFO)",
        auto_logout_warn: "Inactivity detected. You will be logged out in 30 seconds."
      },
      hi: {
        app_name: "किचनकेयर",
        help: "मदद",
        alerts: "चेतावनी",
        logout: "लॉगआउट",
        today_at_glance: "किचन आज की स्थिति",
        expiring_soon: "जल्द खराब होने वाला",
        low_stock: "कम स्टॉक (माल)",
        fridge_temp: "फ्रिज का तापमान",
        orders_cooking: "ऑर्डर तैयार हो रहे हैं",
        add_stock: "नया माल जोड़ें",
        stock_list: "स्टॉक सूची",
        recipes: "रेसिपी और सामग्री",
        wastage: "खराब माल (वेस्टेज)",
        stock_count: "माल गिनती (ऑडिट)",
        temp_log: "तापमान रिकॉर्ड",
        checklists: "सफाई चेकलिस्ट",
        my_orders: "किचन ऑर्डर",
        take_order: "नया ऑर्डर लें",
        active_orders: "चालू ऑर्डर",
        dashboard: "एडमिन डैशबोर्ड",
        chef_perf: "शेफ का काम",
        activity_log: "लॉग रिकॉर्ड",
        reports: "रिपोर्ट और डाउनलोड",
        settings: "सेटिंग्स और स्टाफ",
        start_cooking: "पकाना शुरू करें",
        mark_ready: "तैयार मार्क करें",
        report_problem: "समस्या बताएं",
        send_kitchen: "किचन में भेजें",
        confirm_order: "ऑर्डर चेक करें",
        out_of_stock: "आज उपलब्ध नहीं",
        allergies_q: "कोई एलर्जी है?",
        yes: "हाँ",
        no: "नहीं",
        fresh: "ताज़ा",
        use_soon: "जल्द इस्तेमाल करें",
        expired: "खराब / एक्सपायर",
        save: "सेव करें",
        cancel: "रद्द करें",
        view_action: "देखें",
        confirm: "पुष्टि करें",
        fefo_used: "पुराना बैच पहले काटा गया (FEFO)",
        auto_logout_warn: "निष्क्रियता। 30 सेकंड में ऑटो लॉगआउट होगा।"
      }
    };

    let currentLang = 'en';

    function t(key) {
      if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
      }
      return translations['en'][key] || key;
    }

    function toggleLanguage() {
      currentLang = currentLang === 'en' ? 'hi' : 'en';
      document.getElementById('langLabel').textContent = currentLang === 'en' ? 'हिन्दी' : 'English';
      applyTranslations();
      renderCurrentScreen();
    }

    function applyTranslations() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
      });
    }
