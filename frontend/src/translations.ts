/**
 * Legacy translations file.
 * Re-exports from the new i18n system for backward compatibility.
 */
import resources from './utils/i18n';

// Build a compatible translations object with nested structure
// for components that expect t.someKey or t.leaderboard.title
export const translations = {
  en: {
    ...resources.en,
    heroTitle: resources.en.heroTitle || 'Find your university, notes, and exams.',
    heroSubtitle: resources.en.heroSubtitle || 'Join the largest student community. Share knowledge, pass exams.',
    searchPlaceholder: resources.en.searchPlaceholder || 'Search for subjects, notes, universities...',
    login: resources.en.login || 'Login',
    register: resources.en.register || 'Register',
    logout: resources.en.logout || 'Logout',
    admin: resources.en.admin || 'Admin',
    home: resources.en.home || 'Home',
    profile: resources.en.profile || 'Profile',
    findTerm: resources.en.findTerm || 'Find Term',
    search: resources.en.search || 'Search',
    searchTitle: resources.en.searchTitle || 'Find Your Term',
    searchSubtitle: resources.en.searchSubtitle || 'Search for subjects or fields across all universities.',
    fields: resources.en.fields || 'Fields of Study',
    subjects: resources.en.subjects || 'Subjects',
    semester: resources.en.semester || 'Semester',
    viewUniversity: resources.en.viewUniversity || 'View University',
    noResults: resources.en.noResults || 'No results found. Try a different query.',
    resultsFound: resources.en.resultsFound || 'Results found',
    leaderboard: {
      title: 'Leaderboard',
      subtitle: 'Top active users in the community',
      total_users: 'Total Users',
      top_users: 'Top Users',
      sort: { score: 'Score', activity: 'Activity', notes: 'Notes' },
      columns: { user: 'User', score: 'Score', notes: 'Notes', reviews: 'Reviews', comments: 'Comments', activity: 'Activity' },
      points: 'points',
      notes: 'notes',
      reviews: 'reviews',
      comments: 'comments',
      total: 'total',
      no_data: 'No leaderboard data available yet',
    },
  },
  pl: {
    ...resources.pl,
    heroTitle: resources.pl.heroTitle || 'Znajdź swoją uczelnię, notatki i egzaminy.',
    heroSubtitle: resources.pl.heroSubtitle || 'Dołącz do największej społeczności studentów.',
    searchPlaceholder: resources.pl.searchPlaceholder || 'Szukaj uczelni...',
    login: resources.pl.login || 'Zaloguj się',
    register: resources.pl.register || 'Zarejestruj się',
    logout: resources.pl.logout || 'Wyloguj',
    admin: resources.pl.admin || 'Admin',
    home: resources.pl.home || 'Strona Główna',
    profile: resources.pl.profile || 'Profil',
    findTerm: resources.pl.findTerm || 'Szukaj Przedmiotu',
    search: resources.pl.search || 'Szukaj',
    searchTitle: resources.pl.searchTitle || 'Znajdź Przedmiot',
    searchSubtitle: resources.pl.searchSubtitle || 'Wyszukuj przedmioty i kierunki na wszystkich uczelniach.',
    fields: resources.pl.fields || 'Kierunki Studiów',
    subjects: resources.pl.subjects || 'Przedmioty',
    semester: resources.pl.semester || 'Semestr',
    viewUniversity: resources.pl.viewUniversity || 'Zobacz Uczelnię',
    noResults: resources.pl.noResults || 'Brak wyników.',
    resultsFound: resources.pl.resultsFound || 'Znaleziono wyniki',
    leaderboard: {
      title: 'Ranking',
      subtitle: 'Najaktywniejsi użytkownicy społeczności',
      total_users: 'Wszyscy Użytkownicy',
      top_users: 'Top Użytkownicy',
      sort: { score: 'Punkty', activity: 'Aktywność', notes: 'Notatki' },
      columns: { user: 'Użytkownik', score: 'Punkty', notes: 'Notatki', reviews: 'Recenzje', comments: 'Komentarze', activity: 'Aktywność' },
      points: 'punktów',
      notes: 'notatek',
      reviews: 'recenzji',
      comments: 'komentarzy',
      total: 'razem',
      no_data: 'Brak danych rankingu',
    },
  },
};

export type Language = 'en' | 'pl';
