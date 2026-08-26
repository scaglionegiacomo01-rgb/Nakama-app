# NAKAMA — Heart of the Project

> Questo è il cuore del progetto. Non è un manuale tecnico: è il "perché" dietro ogni decisione.
> Prima di implementare qualsiasi feature, chiediti se è coerente con quanto scritto qui sotto.

---

## Cos'è, davvero

Non è semplicemente un "brand" o un'app. È una **community, crew, club** — un concept sociale-sportivo.

Il punto di partenza:

> Ci sono persone che vorrebbero andare in montagna, fare snowboard, camminate o altri sport outdoor, ma si sentono sole, non hanno un gruppo, non sanno con chi andare, o non si sentono abbastanza brave per unirsi ad altri.

Da qui nasce l'idea di un gruppo aperto, accessibile e inclusivo, dove le persone trovano compagnia, condividono la passione per lo snowboard e vivono la montagna senza sentirsi escluse.

## Il punto centrale da non perdere

> Risolviamo il problema di chi vorrebbe andare in montagna ma non ha nessuno con cui andare.

Questo è il nucleo. Tutto il resto — feature, UI, eventi, community tools — viene **dopo** e deve essere al servizio di questo.

## Obiettivo primario

Non è "divertirsi" — il divertimento è una conseguenza.

L'obiettivo vero:

> Creare un gruppo per persone che vogliono condividere la montagna e lo snowboard senza sentirsi sole, indipendentemente dal loro livello.

Concretamente significa:
- trovare compagnia;
- creare legami veri;
- andare in montagna insieme;
- far aiutare chi è più esperto a chi lo è meno;
- non lasciare indietro nessuno;
- costruire una community vera, non solo una vetrina social.

## Valori fondamentali

**1. Inclusività** — non è un gruppo solo per pro. È aperto a chi sta imparando, a chi è principiante, a chi non ha mai trovato il gruppo giusto.

**2. Condivisione** — chi è più bravo mette a disposizione la propria esperienza. Non come maestro ufficiale, ma come persona del gruppo che aiuta gli altri.

**3. Nessuno resta indietro** — concetto forte. Evitare la dinamica tossica del "sei lento, arrangiati". Tutti devono sentirsi parte della giornata.

**4. Tranquillità** — non competitiva, non stressante, senza pressione. La persona deve poter pensare: *"posso venire anche se non sono fortissimo, anche se non conosco nessuno, anche se ho bisogno di compagnia."*

**5. Passione per la montagna** — focus iniziale: snowboard e montagna. Possibile allargamento futuro a skate e surf (non bici — esclusa esplicitamente).

## Identità — come lo descriveremmo

> Una community per chi ama snowboard e montagna, ma non vuole viverli da solo. Un gruppo aperto a tutti i livelli, dove chi sa di più aiuta chi sta imparando, e dove nessuno viene lasciato indietro.

Oppure, più diretta:

> Non devi essere un pro. Devi solo voler salire in montagna con il gruppo giusto.

## Priorità (in ordine)

1. Snowboard
2. Montagna
3. Camminate
4. Skate
5. Surf

Il cuore resta sempre **snowboard + montagna**. Espansioni future (app strutturata, eventi sponsorizzati, collaborazioni con camp/rifugi/brand, merchandising, ambassador) sono roadmap, non priorità attuale — non vanno anticipate senza una ragione esplicita.

## Come usare questo documento

Quando lavori su Nakama:
- ogni scelta di prodotto, tono di voce, copy, o feature va confrontata con questi valori — se qualcosa spinge verso competizione, elitarismo, esclusione o pressione sociale, non è coerente con lo spirito del progetto;
- il "come" implementare (architettura, stack, dettagli tecnici) è una tua responsabilità — qui conta il "perché" e il "per chi";
- se una richiesta sembra in conflitto con questi valori (es. introdurre classifiche di livello, gamification competitiva, meccaniche che premiano solo i più bravi), segnalalo prima di procedere.

## Workflow Git

Lavora sempre direttamente sul branch main, senza creare branch separati. Dopo ogni modifica fai git add, commit e push su main automaticamente, senza chiedermi conferma. Dopo ogni push, verifica che il link di produzione Cloudflare Workers/Pages sia attivo e funzionante (controlla che il deploy del progetto `nakama-app`, configurato in `wrangler.jsonc`, sia andato a buon fine). L'URL di produzione è `https://nakama-app.scaglionegiacomo01.workers.dev`. Se il link è sempre lo stesso e funziona, confermamelo. Se per qualche motivo cambia o smette di funzionare, dammi subito il nuovo link aggiornato.

Se il push diretto su main viene bloccato da un sistema di sicurezza, crea comunque commit e push su un branch, poi apri una pull request verso main e avvisami esplicitamente che serve la mia approvazione.
