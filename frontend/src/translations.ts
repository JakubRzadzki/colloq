// Dictionary for English and Polish translations
export const translations = {
  en: {
    // Nav & Auth
    login: "Login",
    register: "Register",
    logout: "Logout",
    adminPanel: "Admin Panel",
    home: "Home",

    // Home Page
    filters: "All Universities",
    addNote: "Add Note",
    uploadTitle: "Share Materials",
    titlePlaceholder: "Title (e.g. Calculus Formulas)",
    descPlaceholder: "Description (Markdown supported)...",
    submitBtn: "Submit for Approval",
    latestMaterials: "Latest Materials",
    noNotes: "No notes yet. Be the first!",
    author: "Author",
    score: "Score",

    // Sidebar
    topPosters: "Top Posters",

    // Auth Pages
    emailPlaceholder: "Email Address",
    passPlaceholder: "Password",
    loginBtn: "Sign In",
    registerBtn: "Sign Up",
    successReg: "Account created! You can now login.",
    errorReg: "Registration failed.",
    errorLogin: "Invalid credentials.",

    // Admin
    adminTitle: "Moderation Panel",
    noPending: "No pending notes to review.",
    approveBtn: "Approve",
    viewImage: "View Image",

    // Alerts
    noteAdded: "Note submitted! Waiting for admin approval.",
    uploadError: "Error! Please login first.",
  },
  pl: {
    // Nav & Auth
    login: "Logowanie",
    register: "Rejestracja",
    logout: "Wyloguj",
    adminPanel: "Panel Admina",
    home: "Strona Główna",

    // Home Page
    filters: "Wszystkie Uczelnie",
    addNote: "Dodaj Notatkę",
    uploadTitle: "Udostępnij Materiały",
    titlePlaceholder: "Tytuł (np. Wzory na Całki)",
    descPlaceholder: "Opis (Markdown wspierany)...",
    submitBtn: "Wyślij do akceptacji",
    latestMaterials: "Ostatnie Materiały",
    noNotes: "Brak notatek. Bądź pierwszy!",
    author: "Autor",
    score: "Ocena",

    // Sidebar
    topPosters: "Najlepsi Autorzy",

    // Auth Pages
    emailPlaceholder: "Adres Email",
    passPlaceholder: "Hasło",
    loginBtn: "Zaloguj się",
    registerBtn: "Zarejestruj się",
    successReg: "Konto założone! Możesz się zalogować.",
    errorReg: "Błąd rejestracji.",
    errorLogin: "Błędne dane.",

    // Admin
    adminTitle: "Panel Moderatora",
    noPending: "Brak notatek do sprawdzenia.",
    approveBtn: "Zatwierdź",
    viewImage: "Zobacz zdjęcie",

    // Alerts
    noteAdded: "Notatka dodana! Czeka na weryfikację admina.",
    uploadError: "Błąd! Zaloguj się najpierw.",
  }
};

export type Language = 'en' | 'pl';