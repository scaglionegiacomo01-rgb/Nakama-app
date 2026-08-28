import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "it";

type Dict = Record<string, string>;

const en: Dict = {
  // nav
  "nav.home": "Home",
  "nav.how_it_works": "How it works",
  "nav.trips": "Trips",
  "nav.my_trips": "My trips",
  "nav.gallery": "Gallery",
  "nav.community": "Community",
  "nav.passport": "Passport",
  "nav.profile": "Profile",
  "nav.admin": "Admin",
  "nav.login": "Login",
  "nav.signup": "Join the crew",
  "nav.logout": "Logout",
  "nav.language": "Language",
  "nav.ranks": "Crew Ranks",
  "nav.more": "More",
  "nav.values": "About Nakama",
  "nav.cloud_nine": "Cloud Nine",
  "nav.settings": "Settings",
  "nav.notifications": "Notifications",

  // notification bell
  "notif.title": "Notifications",
  "notif.mark_all_read": "Mark all read",
  "notif.empty": "You're all caught up.",

  "home.value_1_title": "Together",
  "home.value_1_body": "We're not strangers sharing a day. We're a crew.",

  "home.value_2_title": "No ego",
  "home.value_2_body": "Skill doesn't make anyone better than others.",

  "home.value_3_title": "Take responsibility",
  "home.value_3_body": "Show up prepared, do your part and take care of your gear.",

  "home.value_4_title": "Respect the mountain",
  "home.value_4_body": "The mountain is bigger than us. Safety and common sense come first.",

  // home — visitor
  "home.badge": "Season 2026 · Open to all levels",
  "home.title": "Find your group in the mountains.",
  "home.payoff": "Nobody gets left behind.",
  "home.subtitle":
    "An inclusive snowboard and mountain community open to all levels. Share rides, join official trips and spend the day with people who actually wait for you.",
  "home.cta_join": "Join the crew",
  "home.cta_trips": "View next trips",
  "home.why_title": "Why Nakama exists",
  "home.why_body":
    "Most people don't ride alone because they want to, they ride alone because they don't have a group. Nakama exists for the riders, the beginners, the newcomers in town, and anyone who just needs a lift to the slopes.",
  "home.how_title": "How it works",
  "home.upcoming_title": "Next trips",
  "home.see_all": "See all",
  "home.no_trips": "No trips scheduled yet. Check back soon.",
  "home.values_title": "What we stand for",
  "home.safety_title": "Nobody gets left behind",
  "home.safety_body":
    "We ride at the pace of the slowest rider. We wait at the lift. We check in on each other. The mountain is bigger than any of us.",
  "home.how_1_title": "Create your profile",
  "home.how_1_body": "Add your level, gear and transport options.",
  "home.how_2_title": "Browse trips",
  "home.how_2_body": "Find snowboard, mountain and board-sport days.",
  "home.how_3_title": "Join a trip",
  "home.how_3_body": "Tell us if you need a ride, rental or support.",
  "home.how_4_title": "Meet the crew",
  "home.how_4_body": "Share cars, costs and the day with other riders.",
  "home.how_5_title": "Ride together",
  "home.how_5_body": "Beginners are welcome. The group adapts.",
  "home.how_6_title": "Come back together",
  "home.how_6_body": "Nobody gets left behind. Ever.",

  // home — logged in
  "home.welcome": "Welcome back",
  "home.my_next_trip": "My next trip",
  "home.upcoming_for_you": "Upcoming trips",
  "home.passport_progress": "Passport progress",
  "home.quick_actions": "Quick actions",
  "home.no_planned": "You don't have a trip planned yet.",
  "home.find_next": "Find your next trip",
  "home.open_trip": "Open trip",
  "home.check_in_today": "Check in — today is trip day",
  "home.complete_profile": "Complete your profile",
  "home.view_notifications": "Notifications",
  "home.view_gallery": "Gallery",
  "home.rank_current": "Current rank",
  "home.rank_completed_n": "{n} completed trips",
  "home.rank_next_in": "{n} to {title}",
  "home.rank_maxed": "Top of the mountain.",
  "home.departure": "Departure",
  "home.meeting_point": "Meeting",
  "home.seats": "Seats",

  // trip tabs
  "tab.overview": "Overview",
  "tab.checkin": "Check-in",
  "tab.who": "Who's Going",
  "tab.carpool": "Carpool",
  "tab.chat": "Trip Chat",
  "tab.gallery": "Gallery",
  "tab.safety": "Safety",
  "tab.assist": "Beginner Assist",

  // trip
  "trip.join": "Join this trip",
  "trip.join_waitlist": "Join waitlist",
  "trip.signin_to_join": "Sign in to join",
  "trip.you_are_in": "You're in",
  "trip.cancel": "Cancel",
  "trip.recap": "Recap",
  "trip.join_again": "Join again",
  "trip.cancelled_msg": "You cancelled this trip.",
  "trip.all_trips": "← All trips",
  "trip.today_checkin_title": "Today is trip day",
  "trip.today_checkin_cta": "I'm here",
  "trip.today_checkin_done": "Checked in. See you out there.",
  "trip.today_checkin_open": "Open check-in",

  // statuses
  "status.pending": "Pending",
  "status.confirmed": "Confirmed",
  "status.cancelled": "Cancelled",
  "status.waitlisted": "Waitlisted",
  "status.rejected": "Not accepted",

  // ranks
  "ranks.title": "Crew Ranks",
  "ranks.subtitle":
    "Every rank tells a story. Ranks grow with every trip you complete with the crew — no competition, just the road you've ridden together.",
  "ranks.your_rank": "Your rank",
  "ranks.next": "next",
  "ranks.trips_completed": "completed trips",
  "ranks.until_next": "{n} more {tripWord} until {title}",
  "ranks.trip": "trip",
  "ranks.trips": "trips",

  // trips tabs
  "trips.title": "Trips",
  "trips.subtitle": "Available trips, your registrations, past adventures.",
  "trips.tab_available": "Available",
  "trips.tab_mine": "My trips",
  "trips.tab_archive": "Archive",
  "trips.empty_available":
    "No trips scheduled yet. Check back soon — new trips are added every week.",
  "trips.empty_mine": "You haven't joined any trips yet.",
  "trips.empty_archive": "Nothing in your archive yet.",
  "trips.browse": "Browse trips",
  "trips.join_again": "Join again",
  "trips.cancel_participation": "Cancel participation",
  "trips.view_details": "View details",
  "trips.confirm_cancel": "Cancel your participation in this trip?",
  "trips.spots_left": "{n} spots left",

  // profile
  "profile.title": "Your profile",
  "profile.subtitle": "This info helps us organize trips and carpools.",
  "profile.your_card": "Your Nakama card",
  "profile.completion_title": "Profile completion",
  "profile.completion_cta": "Complete profile",
  "profile.missing": "Missing",
  "profile.riding_identity": "Riding identity",
  "profile.trip_identity": "Trip identity",
  "profile.private_info": "Private operational info",
  "profile.private_note": "Only visible to you and trip admins.",
  "profile.edit": "Edit profile",
  "profile.save": "Save profile",
  "profile.saving": "Saving…",
  "profile.section_basic": "Basic info",
  "profile.section_riding": "Riding level",
  "profile.section_equipment": "Equipment & brands",
  "profile.section_transport": "Transport",
  "profile.section_safety": "Safety & emergency",
  "profile.section_preferences": "Bio & agreements",
  "profile.upcoming_trips": "Upcoming trips",
  "profile.completed_trips": "Completed trips",
  "profile.open_passport": "Open Passport",
  "profile.open_gallery": "Open Gallery",

  // auth
  "auth.signup_title": "Join the crew",
  "auth.login_title": "Welcome back",
  "auth.reset_title": "Reset password",
  "auth.signup_sub": "Create your account to join trips.",
  "auth.login_sub": "Sign in to join trips and see your crew.",
  "auth.reset_sub": "We'll email you a reset link.",
  "auth.full_name": "Full name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.create_account": "Create account",
  "auth.sign_in": "Sign in",
  "auth.send_reset": "Send reset link",
  "auth.have_account": "Already have an account? Sign in",
  "auth.no_account": "New here? Create an account",
  "auth.forgot": "Forgot password?",
  "auth.back_to_signin": "Back to sign in",
  "auth.welcome_back": "Welcome back!",
  "auth.reset_sent": "Password reset email sent",
  "auth.check_email_title": "Check your email",
  "auth.check_email_body":
    "We sent a confirmation link to {email}. Open it to activate your account — then you can join the trip.",
  "auth.check_email_hint": "No email? Check your spam folder.",
  "auth.check_email_back": "Back to sign in",

  // join a trip
  "join.title": "Join this trip",
  "join.intro": "Confirm below and you're in. You can add transport and gear details afterwards.",
  "join.accept_liability":
    "I accept the liability disclaimer and acknowledge mountain sports involve risk",
  "join.accept_rules": "I accept the community rules",
  "join.details_toggle": "Add transport and gear details (optional)",
  "join.details_later": "You can always add or change these later from the trip page.",
  "join.transport": "Transport",
  "join.transport_have_car_will_drive": "I have a car and I can drive",
  "join.transport_have_car_no_drive": "I have a car but I can't drive",
  "join.transport_no_car_can_drive": "I don't have a car but I can drive if needed",
  "join.transport_no_car_need_seat": "I don't have a car and I need a seat",
  "join.departure_area": "Departure area",
  "join.seats": "Available passenger seats (after gear)",
  "join.meeting_point": "Meeting point (optional)",
  "join.notes_passengers": "Notes for passengers",
  "join.notes_drivers": "Notes for drivers",
  "join.can_reach_meeting": "I can reach the main meeting point",
  "join.has_equipment": "I have my own snowboard equipment",
  "join.needs_rental": "I need rental",
  "join.notes_organizer": "Notes for the organizer",
  "join.cancel": "Cancel",
  "join.confirm": "Confirm",
  "join.err_accept": "Please accept the disclaimer and rules",
  "join.err_departure": "Please add your departure area",
};

const it: Dict = {
  "nav.home": "Home",
  "nav.how_it_works": "Come funziona",
  "nav.trips": "Viaggi",
  "nav.my_trips": "I miei viaggi",
  "nav.gallery": "Galleria",
  "nav.community": "Community",
  "nav.passport": "Passaporto",
  "nav.profile": "Profilo",
  "nav.admin": "Admin",
  "nav.login": "Accedi",
  "nav.signup": "Unisciti alla crew",
  "nav.logout": "Esci",
  "nav.language": "Lingua",
  "nav.ranks": "Crew Ranks",
  "nav.more": "Altro",
  "nav.values": "Chi siamo",
  "nav.cloud_nine": "Cloud Nine",
  "nav.settings": "Impostazioni",
  "nav.notifications": "Notifiche",

  // notification bell
  "notif.title": "Notifiche",
  "notif.mark_all_read": "Segna tutte come lette",
  "notif.empty": "Sei in pari con tutto.",

  "home.value_1_title": "Stare Insieme",
  "home.value_1_body": "Non siamo estranei che condividono una giornata. Siamo una crew.",

  "home.value_2_title": "Zero ego",
  "home.value_2_body": "Il livello non rende nessuno migliore degli altri.",

  "home.value_3_title": "Responsabilità",
  "home.value_3_body":
    "Presentati preparato, fai la tua parte e prenditi cura della tua attrezzatura.",

  "home.value_4_title": "Rispetta la montagna",
  "home.value_4_body": "La montagna è più grande di noi. Sicurezza e buon senso prima di tutto.",

  // home — visitor
  "home.badge": "Stagione 2026 · Aperti a tutti i livelli",
  "home.title": "Trova il tuo gruppo in montagna.",
  "home.payoff": "Nobody gets left behind.",
  "home.subtitle":
    "Una community per snowboard e montagna, aperta a tutti i livelli. Condividi passaggi, partecipa a viaggi ufficiali e vivi la giornata con persone che ti aspettano davvero.",
  "home.cta_join": "Join the crew",
  "home.cta_trips": "Vedi i prossimi viaggi",
  "home.why_title": "Perché esiste Nakama",
  "home.why_body":
    "La maggior parte delle persone non ride da sola perché lo vuole, lo fa perché non ha un gruppo. Nakama esiste per i rider, i principianti, chi è appena arrivato in città e chiunque abbia solo bisogno di un passaggio per la montagna.",
  "home.how_title": "Come funziona",
  "home.upcoming_title": "Prossimi viaggi",
  "home.see_all": "Vedi tutti",
  "home.no_trips": "Nessun viaggio in programma. Torna presto.",
  "home.values_title": "Cosa rappresentiamo",
  "home.safety_title": "Nobody gets left behind",
  "home.safety_body":
    "Andiamo al ritmo di chi è più lento. Aspettiamo all'impianto. Ci controlliamo a vicenda. La montagna è più grande di chiunque di noi.",
  "home.how_1_title": "Crea il tuo profilo",
  "home.how_1_body": "Aggiungi livello, attrezzatura e opzioni di trasporto.",
  "home.how_2_title": "Scopri le uscite",
  "home.how_2_body": "Trova giornate di snowboard, montagna e sport con la tavola.",
  "home.how_3_title": "Unisciti a un’uscita",
  "home.how_3_body": "Segnala se ti serve un passaggio, un noleggio o supporto.",
  "home.how_4_title": "Incontra la crew",
  "home.how_4_body": "Condividi macchine, costi e giornata con altri rider.",
  "home.how_5_title": "Scendi insieme al gruppo",
  "home.how_5_body": "I principianti sono benvenuti. Il gruppo si adatta.",
  "home.how_6_title": "Si torna insieme",
  "home.how_6_body": "Nessuno viene lasciato indietro. Mai.",

  // home — logged in
  "home.welcome": "Bentornato",
  "home.my_next_trip": "Il tuo prossimo viaggio",
  "home.upcoming_for_you": "Viaggi in arrivo",
  "home.passport_progress": "Progresso passaporto",
  "home.quick_actions": "Azioni rapide",
  "home.no_planned": "Non hai ancora un viaggio in programma.",
  "home.find_next": "Trova il prossimo viaggio",
  "home.open_trip": "Apri viaggio",
  "home.check_in_today": "Check-in — oggi è il giorno del viaggio",
  "home.complete_profile": "Completa il profilo",
  "home.view_notifications": "Notifiche",
  "home.view_gallery": "Galleria",
  "home.rank_current": "Rango attuale",
  "home.rank_completed_n": "{n} viaggi completati",
  "home.rank_next_in": "{n} per {title}",
  "home.rank_maxed": "In cima alla montagna.",
  "home.departure": "Partenza",
  "home.meeting_point": "Ritrovo",
  "home.seats": "Posti",

  "tab.overview": "Panoramica",
  "tab.checkin": "Check-in",
  "tab.who": "Chi partecipa",
  "tab.carpool": "Carpool",
  "tab.chat": "Chat del viaggio",
  "tab.gallery": "Galleria",
  "tab.safety": "Sicurezza",
  "tab.assist": "Aiuto principianti",

  "trip.join": "Partecipa",
  "trip.join_waitlist": "Iscriviti alla lista d'attesa",
  "trip.signin_to_join": "Accedi per partecipare",
  "trip.you_are_in": "Sei dentro",
  "trip.cancel": "Annulla",
  "trip.recap": "Riepilogo",
  "trip.join_again": "Partecipa di nuovo",
  "trip.cancelled_msg": "Hai annullato questo viaggio.",
  "trip.all_trips": "← Tutti i viaggi",
  "trip.today_checkin_title": "Oggi è il giorno del viaggio",
  "trip.today_checkin_cta": "Sono qui",
  "trip.today_checkin_done": "Check-in fatto. Ci vediamo lì.",
  "trip.today_checkin_open": "Apri check-in",

  "status.pending": "In attesa",
  "status.confirmed": "Confermato",
  "status.cancelled": "Annullato",
  "status.waitlisted": "In lista d'attesa",
  "status.rejected": "Non accettato",

  "ranks.title": "Crew Ranks",
  "ranks.subtitle":
    "Ogni rango racconta una storia. I ranghi crescono con ogni viaggio completato con la crew — nessuna competizione, solo la strada percorsa insieme.",
  "ranks.your_rank": "Il tuo rango",
  "ranks.next": "prossimo",
  "ranks.trips_completed": "viaggi completati",
  "ranks.until_next": "Ancora {n} {tripWord} per diventare {title}",
  "ranks.trip": "viaggio",
  "ranks.trips": "viaggi",

  // trips tabs
  "trips.title": "Viaggi",
  "trips.subtitle": "Viaggi disponibili, le tue iscrizioni e quelli passati.",
  "trips.tab_available": "Disponibili",
  "trips.tab_mine": "I miei viaggi",
  "trips.tab_archive": "Archivio",
  "trips.empty_available":
    "Nessun viaggio in programma. Torna presto — nuovi viaggi ogni settimana.",
  "trips.empty_mine": "Non sei iscritto a nessun viaggio.",
  "trips.empty_archive": "Il tuo archivio è ancora vuoto.",
  "trips.browse": "Sfoglia i viaggi",
  "trips.join_again": "Iscriviti di nuovo",
  "trips.cancel_participation": "Annulla partecipazione",
  "trips.view_details": "Dettagli",
  "trips.confirm_cancel": "Annullare la partecipazione a questo viaggio?",
  "trips.spots_left": "{n} posti liberi",

  // profile
  "profile.title": "Il tuo profilo",
  "profile.subtitle": "Queste info ci aiutano a organizzare viaggi e carpool.",
  "profile.your_card": "La tua carta Nakama",
  "profile.completion_title": "Completamento profilo",
  "profile.completion_cta": "Completa profilo",
  "profile.missing": "Mancano",
  "profile.riding_identity": "Identità rider",
  "profile.trip_identity": "Identità viaggi",
  "profile.private_info": "Info operative private",
  "profile.private_note": "Visibili solo a te e agli admin del viaggio.",
  "profile.edit": "Modifica profilo",
  "profile.save": "Salva profilo",
  "profile.saving": "Salvataggio…",
  "profile.section_basic": "Info di base",
  "profile.section_riding": "Livello",
  "profile.section_equipment": "Equipaggiamento e brand",
  "profile.section_transport": "Trasporto",
  "profile.section_safety": "Sicurezza ed emergenza",
  "profile.section_preferences": "Bio e accordi",
  "profile.upcoming_trips": "Viaggi in arrivo",
  "profile.completed_trips": "Viaggi completati",
  "profile.open_passport": "Apri Passaporto",
  "profile.open_gallery": "Apri Galleria",

  // auth
  "auth.signup_title": "Unisciti alla crew",
  "auth.login_title": "Bentornato",
  "auth.reset_title": "Reimposta password",
  "auth.signup_sub": "Crea il tuo account per partecipare ai viaggi.",
  "auth.login_sub": "Accedi per partecipare ai viaggi e vedere la tua crew.",
  "auth.reset_sub": "Ti mandiamo un link per reimpostarla.",
  "auth.full_name": "Nome e cognome",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.create_account": "Crea account",
  "auth.sign_in": "Accedi",
  "auth.send_reset": "Invia link",
  "auth.have_account": "Hai già un account? Accedi",
  "auth.no_account": "Nuovo qui? Crea un account",
  "auth.forgot": "Password dimenticata?",
  "auth.back_to_signin": "Torna all'accesso",
  "auth.welcome_back": "Bentornato!",
  "auth.reset_sent": "Email di reset inviata",
  "auth.check_email_title": "Controlla la tua email",
  "auth.check_email_body":
    "Abbiamo inviato un link di conferma a {email}. Aprilo per attivare il tuo account — poi potrai iscriverti al viaggio.",
  "auth.check_email_hint": "Non arriva? Controlla anche lo spam.",
  "auth.check_email_back": "Torna all'accesso",

  // iscrizione a un viaggio
  "join.title": "Partecipa a questo viaggio",
  "join.intro": "Conferma qui sotto e sei dentro. Trasporto e attrezzatura puoi aggiungerli dopo.",
  "join.accept_liability":
    "Accetto la liberatoria e sono consapevole che gli sport di montagna comportano dei rischi",
  "join.accept_rules": "Accetto le regole della community",
  "join.details_toggle": "Aggiungi trasporto e attrezzatura (facoltativo)",
  "join.details_later": "Puoi aggiungerli o modificarli quando vuoi dalla pagina del viaggio.",
  "join.transport": "Trasporto",
  "join.transport_have_car_will_drive": "Ho la macchina e posso guidare",
  "join.transport_have_car_no_drive": "Ho la macchina ma non posso guidare",
  "join.transport_no_car_can_drive": "Non ho la macchina ma posso guidare se serve",
  "join.transport_no_car_need_seat": "Non ho la macchina e mi serve un passaggio",
  "join.departure_area": "Zona di partenza",
  "join.seats": "Posti disponibili (esclusa l'attrezzatura)",
  "join.meeting_point": "Punto d'incontro (facoltativo)",
  "join.notes_passengers": "Note per i passeggeri",
  "join.notes_drivers": "Note per chi guida",
  "join.can_reach_meeting": "Posso raggiungere il punto d'incontro principale",
  "join.has_equipment": "Ho la mia attrezzatura da snowboard",
  "join.needs_rental": "Mi serve il noleggio",
  "join.notes_organizer": "Note per l'organizzatore",
  "join.cancel": "Annulla",
  "join.confirm": "Conferma",
  "join.err_accept": "Devi accettare la liberatoria e le regole",
  "join.err_departure": "Aggiungi la tua zona di partenza",
};

const DICTS: Record<Lang, Dict> = { en, it };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

function detect(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("lang") as Lang | null;
  if (stored === "en" || stored === "it") return stored;
  const nav = (window.navigator.language || "en").toLowerCase();
  return nav.startsWith("it") ? "it" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detect());
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("lang", l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let v = DICTS[lang][key] ?? DICTS.en[key] ?? key;
    if (vars)
      for (const k of Object.keys(vars)) v = v.replace(new RegExp(`{${k}}`, "g"), String(vars[k]));
    return v;
  };

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;
