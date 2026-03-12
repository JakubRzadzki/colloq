/**
 * Colloq Internationalization System
 * Lightweight dictionary-based translation with localStorage persistence.
 * Supports English (en) and Polish (pl).
 */

export type Language = 'en' | 'pl';

/** Translation function type for component props */
export type TFunction = (key: string, lang?: Language) => string;

interface TranslationDict {
  [key: string]: string;
}

interface Resources {
  en: TranslationDict;
  pl: TranslationDict;
}

const resources: Resources = {
  en: {
    // Navigation
    home: 'Home',
    search: 'Search',
    universities: 'Universities',
    profile: 'Profile',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    admin: 'Admin',
    findTerm: 'Find Term',

    // Theme & Language
    light_mode: 'Light Mode',
    dark_mode: 'Dark Mode',
    language: 'Language',
    english: 'English',
    polish: 'Polish',

    // Hero Section
    hero_title: 'Your Academic Knowledge Hub',
    heroTitle: 'Find your university, notes, and exams.',
    hero_subtitle: 'Share, discover, and grow together',
    heroSubtitle: 'Join the largest student community. Share knowledge, pass exams.',
    get_started: 'Get Started',

    // Search
    search_placeholder: 'Search notes, universities, or terms...',
    searchPlaceholder: 'Search for subjects, notes, universities...',
    search_results: 'Search Results',
    no_results: 'No results found',
    noResults: 'No results found. Try a different query.',
    searchTitle: 'Find Your Term',
    searchSubtitle: 'Search for subjects or fields across all universities.',
    resultsFound: 'Results found',

    // Live Feed
    live_feed: 'Live Data Feed',
    recent_notes: 'Recent Notes',
    recently_added: 'Recently Added Materials',
    recent_reviews: 'Recent Reviews',
    view_all: 'View All',

    // Leaderboard
    top_contributors: 'Top Contributors',
    reputation: 'Reputation',
    uploads: 'Uploads',
    leaderboard_title: 'Leaderboard',
    leaderboard_subtitle: 'Top active users in the community',

    // Stats
    stats: 'Community Stats',
    total_users: 'Total Users',
    total_notes: 'Total Notes',
    total_universities: 'Total Universities',
    join_community: 'Join',
    students_suffix: '+ students',
    notes_available: '+ notes available',

    // Notes
    notes: 'Notes',
    upload_note: 'Upload Note',
    upload_btn: 'Upload',
    title: 'Title',
    description: 'Description',
    file: 'File',
    attachment: 'Attachment',
    university: 'University',
    faculty: 'Faculty',
    upload: 'Upload',
    cancel: 'Cancel',
    upload_success: 'Note uploaded successfully!',
    upload_error: 'Failed to upload note. Please try again.',

    // Upload Barrier (Growth Engine)
    upload_barrier_title: 'Community Driven',
    upload_barrier_message: 'Upload 1 note to unlock full access to all materials.',
    upload_barrier_desc: 'You need to upload at least one note to access other users\' notes. This helps maintain the quality and growth of our community.',
    unlock_with_upload: 'Upload to Unlock',

    // Profile
    my_profile: 'My Profile',
    my_uploads: 'My Uploads',
    reputation_points: 'Reputation Points',
    edit_profile: 'Edit Profile',
    save_changes: 'Save Changes',
    profile_updated: 'Profile updated successfully!',

    // University
    create_university: 'Create University',
    university_name: 'University Name',
    city: 'City',
    country: 'Country',

    // Faculty
    create_faculty: 'Create Faculty',
    faculty_name: 'Faculty Name',

    // Auth
    email: 'Email',
    password: 'Password',
    nickname: 'Nickname',
    confirm_password: 'Confirm Password',
    login_success: 'Login successful!',
    register_success: 'Registration successful!',
    login_error: 'Invalid email or password',
    register_error: 'Registration failed. Please try again.',

    // Reviews
    rate_note: 'Rate this note',
    write_review: 'Write a review',
    submit_review: 'Submit Review',

    // Search filters & categories
    fields: 'Fields of Study',
    subjects: 'Subjects',
    semester: 'Semester',
    viewUniversity: 'View University',

    // Errors & Loading
    error: 'Error',
    something_went_wrong: 'Something went wrong. Please try again.',
    loading: 'Loading...',
    saving: 'Saving...',
    uploading: 'Uploading...',

    // Actions
    view: 'View',
    edit: 'Edit',
    history: 'History',
    version_history: 'Version History',
    edited_on: 'Edited on',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',
    create: 'Create',

    // Note page
    note_details: 'Note Details',
    download: 'Download',
    by_author: 'by',
    no_notes_yet: 'No notes yet',
    be_first_to_upload: 'Be the first to upload!',

    // Regions
    browse_by_region: 'Browse by Region',
    available_universities: 'Available Universities',
    add_university: 'Add University',
  },
  pl: {
    // Navigation
    home: 'Strona Główna',
    search: 'Szukaj',
    universities: 'Uczelnie',
    profile: 'Profil',
    login: 'Zaloguj się',
    register: 'Zarejestruj się',
    logout: 'Wyloguj',
    admin: 'Admin',
    findTerm: 'Szukaj Przedmiotu',

    // Theme & Language
    light_mode: 'Tryb Jasny',
    dark_mode: 'Tryb Ciemny',
    language: 'Język',
    english: 'Angielski',
    polish: 'Polski',

    // Hero Section
    hero_title: 'Twoje Akademickie Centrum Wiedzy',
    heroTitle: 'Znajdź swoją uczelnię, notatki i egzaminy.',
    hero_subtitle: 'Dzielcie się, odkrywajcie i rozwijajcie razem',
    heroSubtitle: 'Dołącz do największej społeczności studentów. Dziel się wiedzą, zdawaj egzaminy.',
    get_started: 'Rozpocznij',

    // Search
    search_placeholder: 'Szukaj notatek, uczelni lub przedmiotów...',
    searchPlaceholder: 'Szukaj przedmiotów, notatek, uczelni...',
    search_results: 'Wyniki wyszukiwania',
    no_results: 'Brak wyników',
    noResults: 'Brak wyników. Spróbuj innego zapytania.',
    searchTitle: 'Znajdź Przedmiot',
    searchSubtitle: 'Wyszukuj przedmioty i kierunki na wszystkich uczelniach.',
    resultsFound: 'Znaleziono wyniki',

    // Live Feed
    live_feed: 'Aktualności',
    recent_notes: 'Ostatnie Notatki',
    recently_added: 'Ostatnio Dodane Materiały',
    recent_reviews: 'Ostatnie Recenzje',
    view_all: 'Zobacz Wszystko',

    // Leaderboard
    top_contributors: 'Najaktywiejsi',
    reputation: 'Reputacja',
    uploads: 'Przesłane',
    leaderboard_title: 'Ranking',
    leaderboard_subtitle: 'Najaktywniejsi użytkownicy społeczności',

    // Stats
    stats: 'Statystyki Społeczności',
    total_users: 'Użytkownicy',
    total_notes: 'Notatki',
    total_universities: 'Uczelnie',
    join_community: 'Dołącz do',
    students_suffix: '+ studentów',
    notes_available: '+ dostępnych notatek',

    // Notes
    notes: 'Notatki',
    upload_note: 'Prześlij Notatkę',
    upload_btn: 'Prześlij',
    title: 'Tytuł',
    description: 'Opis',
    file: 'Plik',
    attachment: 'Załącznik',
    university: 'Uczelnia',
    faculty: 'Wydział',
    upload: 'Prześlij',
    cancel: 'Anuluj',
    upload_success: 'Notatka przesłana pomyślnie!',
    upload_error: 'Nie udało się przesłać notatki. Spróbuj ponownie.',

    // Upload Barrier (Growth Engine)
    upload_barrier_title: 'Społeczność Napędza Wiedzę',
    upload_barrier_message: 'Prześlij 1 notatkę, aby odblokować pełny dostęp do materiałów.',
    upload_barrier_desc: 'Musisz przesłać co najmniej jedną notatkę, aby uzyskać dostęp do notatek innych użytkowników.',
    unlock_with_upload: 'Prześlij, aby Odblokować',

    // Profile
    my_profile: 'Mój Profil',
    my_uploads: 'Moje Przesłane',
    reputation_points: 'Punkty Reputacji',
    edit_profile: 'Edytuj Profil',
    save_changes: 'Zapisz Zmiany',
    profile_updated: 'Profil zaktualizowany!',

    // University
    create_university: 'Dodaj Uczelnię',
    university_name: 'Nazwa Uczelni',
    city: 'Miasto',
    country: 'Kraj',

    // Faculty
    create_faculty: 'Dodaj Wydział',
    faculty_name: 'Nazwa Wydziału',

    // Auth
    email: 'Email',
    password: 'Hasło',
    nickname: 'Pseudonim',
    confirm_password: 'Potwierdź Hasło',
    login_success: 'Zalogowano pomyślnie!',
    register_success: 'Rejestracja zakończona!',
    login_error: 'Nieprawidłowy email lub hasło',
    register_error: 'Rejestracja nie powiodła się.',

    // Reviews
    rate_note: 'Oceń tę notatkę',
    write_review: 'Napisz recenzję',
    submit_review: 'Wyślij Recenzję',

    // Search filters & categories
    fields: 'Kierunki Studiów',
    subjects: 'Przedmioty',
    semester: 'Semestr',
    viewUniversity: 'Zobacz Uczelnię',

    // Errors & Loading
    error: 'Błąd',
    something_went_wrong: 'Coś poszło nie tak. Spróbuj ponownie.',
    loading: 'Ładowanie...',
    saving: 'Zapisywanie...',
    uploading: 'Przesyłanie...',

    // Actions
    view: 'Zobacz',
    edit: 'Edytuj',
    history: 'Historia',
    version_history: 'Historia Wersji',
    edited_on: 'Edytowano',
    delete: 'Usuń',
    close: 'Zamknij',
    back: 'Wróć',
    create: 'Utwórz',

    // Note page
    note_details: 'Szczegóły Notatki',
    download: 'Pobierz',
    by_author: 'autor',
    no_notes_yet: 'Brak notatek',
    be_first_to_upload: 'Bądź pierwszą osobą, która prześle!',

    // Regions
    browse_by_region: 'Przeglądaj wg Regionu',
    available_universities: 'Dostępne Uczelnie',
    add_university: 'Dodaj Uczelnię',
  },
};

/**
 * Get the current language from localStorage.
 * Defaults to 'pl' (Polish) if not set.
 */
export function getCurrentLanguage(): Language {
  const stored = localStorage.getItem('lang');
  if (stored === 'en' || stored === 'pl') return stored;
  return 'pl';
}

/**
 * Set the current language in localStorage.
 */
export function setLanguage(lang: Language): void {
  localStorage.setItem('lang', lang);
}

/**
 * Translation function.
 * Looks up a key in the current language dictionary.
 * Falls back to English, then returns the key itself.
 * @param key - Translation key
 * @param lang - Optional language override
 * @returns Translated string
 */
export function t(key: string, lang?: Language): string {
  const currentLang = lang || getCurrentLanguage();
  return resources[currentLang]?.[key] || resources['en']?.[key] || key;
}

/**
 * Get the entire translation dictionary for a language.
 * Useful for passing to components as a prop.
 */
export function getTranslations(lang?: Language): TranslationDict {
  const currentLang = lang || getCurrentLanguage();
  return resources[currentLang] || resources['en'];
}

/**
 * React hook for translations.
 * Returns a translation function and the current language.
 */
export function useTranslation() {
  const lang = getCurrentLanguage();
  const translate = (key: string) => t(key, lang);
  return { t: translate, lang };
}

export default resources;
