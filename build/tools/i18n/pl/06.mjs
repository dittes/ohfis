export default {
'color-converter': [[
`Wpisz kolor w dowolnym popularnym zapisie (#2557D6, rgb(37 87 214), hsl(223 70% 48%), cmyk(83 59 0 16) lub nazwę, np. coral) i otrzymaj wszystkie pozostałe, gotowe do skopiowania. Użyj próbnika albo – w Chrome i Edge – zakraplacza, by pobrać kolor z dowolnego miejsca na ekranie.`,
`Bazą jest RGB. HSL i HSV wyprowadzane są standardowymi wzorami, HEX to RGB w systemie szesnastkowym (z kanałem alfa jako ósmą i dziewiątą cyfrą, jeśli jest), a CMYK używa prostej konwersji K = 1 − max(R, G, B), z której wynikają C, M i Y. To CMYK jest tylko zgrubną wskazówką: prawdziwe kolory druku zależą od farby, papieru i profilu. Wartości alfa z rgb(… / 50%) i 8-cyfrowego HEX są zachowane.`],
[`Wpisz kolor lub użyj próbnika albo zakraplacza.`,`Odczytaj wszystkie formaty.`,`Skopiuj potrzebny.`],
[[`Jak zamienić HEX na RGB?`,`Podziel sześć cyfr na pary i odczytaj każdą jako liczbę szesnastkową: #2557D6 → 25, 57, D6 → 37, 87, 214.`],[`Czy mogę dokładnie zamienić RGB na CMYK?`,`Nie dokładnie: ekrany i drukarki mają różne gamy barw. Wzór to dobre przybliżenie; do druku użyj przepływu z zarządzaniem kolorem.`]]],
'uuid-generator': [[
`Utwórz jeden UUID lub dziesięć tysięcy: wersja 4 (losowa) do ogólnego użytku albo wersja 7, która zaczyna się od znacznika czasu, dzięki czemu ID sortują się według czasu utworzenia, a indeksy baz danych pozostają szybkie. Formaty wyjścia to wielkie litery, bez myślników, nawiasy klamrowe Microsoftu i listy w cudzysłowach SQL.`,
`Wersja 4 ustawia 122 z 128 bitów z crypto.getRandomValues, kryptograficznie bezpiecznego generatora przeglądarki; pozostałe 6 bitów oznacza wersję (4) i wariant. Wersja 7 (RFC 9562) wstawia czas Uniksa w milisekundach w pierwsze 48 bitów, a resztę wypełnia bitami losowymi. Szansa kolizji v4 jest pomijalna: trzeba by wygenerować około 2,7 tryliona UUID, by mieć 50% szansy na jeden duplikat.`],
[`Wybierz wersję, liczbę i format.`,`Zmień ustawienie lub naciśnij „Generuj nową partię”.`,`Skopiuj listę.`],
[[`Jaka jest różnica między UUID a GUID?`,`W praktyce żadna. GUID to nazwa Microsoftu dla tego samego 128-bitowego identyfikatora.`],[`Czy jako klucza bazy użyć v4 czy v7?`,`Zwykle v7: jest wystarczająco losowy, by być unikatowy, a rośnie w czasie, co unika fragmentacji indeksu.`]]],
'number-base-converter': [[
`Wpisz liczbę w dowolnym systemie od 2 do 36 i zobacz ją binarnie, ósemkowo, dziesiętnie, szesnastkowo i w jeszcze jednym wybranym systemie. Przedrostki jak 0x i 0b oraz podkreślenia są rozumiane, a liczby mogą być dowolnie duże, bo narzędzie używa liczb całkowitych o dowolnej precyzji zamiast zmiennoprzecinkowych.`,
`Wejście jest czytane cyfra po cyfrze w wybranym systemie do BigInt, więc wartości powyżej 2^53 są dokładne (gdzie zwykłe liczby JavaScript gubiłyby cyfry), a potem zapisywane w każdym systemie docelowym przez toString(base). Nieprawidłowe cyfry są wskazane w komunikacie o błędzie. Liczba bitów pokazuje, ile cyfr binarnych potrzebuje liczba, więc czy zmieści się w 8, 16, 32 lub 64 bitach.`],
[`Wpisz liczbę i wybierz jej system.`,`Odczytaj pozostałe systemy.`,`Skopiuj potrzebną wartość.`],
[[`Jak zamienić hex na dziesiętny?`,`Każda cyfra szesnastkowa jest warta 16 razy więcej niż ta po jej prawej: FF = 15×16 + 15 = 255.`],[`Jaką największą liczbę obsłuży?`,`Nie ma stałego limitu; ogranicza tylko pamięć.`]]],
'basic-auth-header-generator': [[
`Wpisz nazwę użytkownika i hasło, a otrzymasz dokładny nagłówek HTTP oraz równoważną opcję curl. Przydatne do testowania API, konfigurowania webhooków lub ustawiania reverse proxy.`,
`Uwierzytelnianie HTTP Basic (RFC 7617) łączy nazwę użytkownika i hasło dwukropkiem, koduje wynik jako Base64 (UTF-8) i wysyła jako „Authorization: Basic <wartość>”. Przykład z RFC, Aladdin / open sesame, daje QWxhZGRpbjpvcGVuIHNlc2FtZQ==. Base64 nie jest szyfrowaniem, więc dane może odczytać każdy, kto zobaczy żądanie: używaj Basic tylko przez HTTPS. Twoje dane zostają w przeglądarce.`],
[`Wpisz nazwę użytkownika i hasło.`,`Skopiuj nagłówek lub opcję curl.`,`Używaj tylko przez HTTPS.`],
[[`Czy uwierzytelnianie Basic jest bezpieczne?`,`Tylko przez HTTPS. Dane są jedynie zakodowane w Base64, nie zaszyfrowane.`],[`Czy nazwa użytkownika może zawierać dwukropek?`,`Nie. Pierwszy dwukropek oddziela użytkownika od hasła, więc nazwa nie może go zawierać.`]]],
'hex-alpha-calculator': [[
`Dodaj przezroczystość do koloru hex: wpisz krycie w procentach, a otrzymasz dwucyfrowy przyrostek i, z kolorem bazowym, pełny 8-cyfrowy kod (#2557D680). Tabela podaje typowe stopnie od 0 do 100 procent.`,
`Kanał alfa przebiega od 0 do 255, więc hex alfa = zaokrąglenie(krycie ÷ 100 × 255), zapisane szesnastkowo: 50% → 127,5 → 128 → 80, 80% → 204 → CC. CSS i przeglądarki używają #RRGGBBAA (alfa na końcu); zasoby Androida używają #AARRGGBB (alfa na początku), więc sprawdź, czego oczekuje Twoja platforma.`],
[`Wpisz krycie w procentach.`,`Opcjonalnie wpisz kolor bazowy.`,`Skopiuj przyrostek lub pełny kolor.`],
[[`Ile to 50% krycia w hex?`,`80 (dziesiętnie 128), więc #000000 przy połowie krycia to #00000080.`],[`Czy Android używa tej samej kolejności?`,`Nie: Android zapisuje alfa na początku (#80000000).`]]],
'meta-viewport-generator': [[
`Znacznik meta viewport mówi przeglądarkom mobilnym, aby używały szerokości urządzenia zamiast udawać 980-pikselowy pulpit. Wybierz opcje i skopiuj znacznik; generator zostawia włączony zoom szczypaniem, bo jego wyłączenie narusza wymogi dostępności.`,
`„width=device-width, initial-scale=1” to zalecana wartość domyślna. viewport-fit=cover pozwala treści sięgać pod wcięcie w iPhone’ach (połącz z safe-area insets w CSS), a stała szerokość jest tylko na szczególne przypadki. maximum-scale i user-scalable=no celowo nie są oferowane: blokują powiększanie osobom słabowidzącym (WCAG 1.4.4).`],
[`Wybierz szerokość i skalę początkową.`,`Dodaj viewport-fit, jeśli projektujesz dla telefonów z wcięciem.`,`Skopiuj znacznik do <head>.`],
[[`Czy potrzebuję tego znacznika?`,`Tak, dla każdej responsywnej strony. Bez niego telefony pokazują pomniejszony układ pulpitowy.`],[`Czy wyłączyć powiększanie?`,`Nie. Szkodzi dostępności, a większość przeglądarek i tak to ignoruje.`]]],
'favicon-html-generator': [[
`Wybierz, jakie pliki ikon masz, a otrzymasz właściwe znaczniki <link> w kolejności preferowanej przez przeglądarki oraz gotowy manifest aplikacji webowej. Połącz z Generatorem favicon i ikon aplikacji, aby stworzyć same pliki obrazów.`,
`Nowoczesne ustawienia wymagają niewiele: ikony SVG (skaluje się, obsługuje tryb ciemny), zapasowego .ico lub PNG 32 px, apple-touch-icon 180 px oraz manifestu z ikonami 192 i 512 px dla Androida i instalowalnych aplikacji webowych. Znaczniki i manifest używają wpisanego folderu, więc ścieżki działają z każdej strony.`],
[`Wpisz folder z ikonami.`,`Zaznacz dostarczane ikony i ustaw kolor motywu.`,`Skopiuj znaczniki do <head> i zapisz manifest.`],
[[`Jakich rozmiarów favicon potrzebuję?`,`SVG lub PNG/ICO 32×32 dla przeglądarek, 180×180 dla urządzeń Apple oraz 192×192 i 512×512 dla Androida.`],[`Gdzie umieścić favicon.ico?`,`W katalogu głównym witryny; przeglądarki domyślnie pytają tam.`]]],
'query-string-builder': [[
`Wypisz parametry jako wiersze key=value i otrzymaj zakodowany ciąg zapytania, opcjonalnie dołączony do bazowego URL. Spacje, ampersandy, znaki równości, akcenty i emoji są poprawnie ucieczkowane, a powtórzone klucze można zapisać jako tag=a&tag=b, tag[]=a&tag[]=b lub tag=a,b.`,
`Każdy klucz i wartość jest kodowany jako UTF-8 z kodowaniem procentowym przez encodeURIComponent plus znaki, które ono pomija (! ' ( ) *), więc wynik jest bezpieczny w każdym URL. Spacje stają się %20 lub +, jeśli wybierzesz styl kodowania formularzy. Ponowne kodowanie całego URL zakodowałoby podwójnie (%2520), więc zbuduj ciąg zapytania raz i dołącz go. Puste klucze są pomijane.`],
[`Wpisz parametry jako wiersze key=value.`,`Wybierz, jak zapisywać spacje i powtórzone klucze.`,`Skopiuj ciąg zapytania lub pełny URL.`],
[[`%20 czy + dla spacji?`,`%20 działa wszędzie w URL. + oznacza spację tylko w ciągach zapytań kodowanych jak formularz (application/x-www-form-urlencoded).`],[`Dlaczego & zamieniane jest na %26?`,`Bo dosłowny & w wartości zacząłby inaczej nowy parametr.`]]],
};
