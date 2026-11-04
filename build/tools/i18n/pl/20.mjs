export default {
'scratchpad': [[
`Pusta strona na to, co musisz zanotować teraz: numer telefonu, szkic, listę zadań. Wszystko, co wpiszesz, jest zapisywane po każdej przerwie, więc awaria, restart lub przypadkowe zamknięcie karty niczego nie zgubi. Używaj kilku kartek, zmieniaj ich nazwy i pobieraj każdą jako plik tekstowy.`,
`Tekst jest zapisywany w localStorage przeglądarki tylko na tym urządzeniu: nic nie jest przesyłane i nie ma konta. Oznacza to też, że notatki nie synchronizują się z innymi urządzeniami, a wyczyszczenie danych witryn, okno prywatne lub inna przeglądarka zaczynają od pustej. Wiersz stanu pokazuje, czy zapis się udał (pamięć może być zablokowana w trybie prywatnym). Nie przechowuj w notatniku haseł ani poufnych danych; użyj do tego narzędzia zaszyfrowanych notatek lub menedżera haseł.`],
[`Pisz na kartce; zapisuje się automatycznie.`,`Dodawaj lub zmieniaj nazwy kartek dla różnych tematów.`,`Skopiuj lub pobierz tekst, gdy potrzebujesz go gdzie indziej.`],
[[`Gdzie jest zapisywany mój tekst?`,`Tylko w tej przeglądarce na tym urządzeniu (localStorage). Nie jest wysyłany na żaden serwer.`],[`Czy go stracę, jeśli wyczyszczę dane przeglądania?`,`Tak. Ważne notatki pobierz jako plik.`]]],
'checklist-maker': [[
`Zrób listę kontrolną na start, podróż lub procedurę: dodawaj pozycje, odhaczaj je, zmieniaj kolejność i zobacz pasek postępu i procent ukończenia. Skopiuj listę jako tekst ze znacznikami [x] i [ ] do wklejenia w zgłoszeniu lub wiadomości.`,
`Lista jest zapisywana w localStorage tej przeglądarki i rysowana od nowa przy każdej zmianie; postęp to liczba odhaczonych pozycji podzielona przez ich sumę. Nie ma kont ani synchronizacji, co czyni ją prywatną listą jednej osoby na jednym urządzeniu. Dla list wspólnych użyj narzędzia zespołowego; dla wydrukowanej listy skopiuj tekst do dokumentu.`],
[`Wpisz pozycję i naciśnij Enter, by ją dodać.`,`Odhaczaj pozycje; przesuwaj je w górę lub usuwaj.`,`Skopiuj listę lub usuń ukończone pozycje.`],
[[`Czy moja lista jest prywatna?`,`Tak. Zostaje w przeglądarce i nigdy nie jest przesyłana.`],[`Czy mogę udostępnić listę kontrolną?`,`Użyj „Kopiuj jako tekst” i wklej ją w wiadomości lub dokumencie.`]]],
'kanban-board': [[
`Naszkicuj swoją pracę jako karty w trzech kolumnach: co czeka, co robisz teraz i co jest zrobione. Przeciągaj karty między kolumnami (lub używaj strzałek), dodawaj karty pisaniem i skopiuj tablicę jako Markdown do raportu o stanie.`,
`Tablica to mała struktura danych z kolumn i kart, zapisywana w localStorage po każdej zmianie i rysowana natywnym przeciąganiem przeglądarki plus przyciskami strzałek dla użytkowników klawiatury. To celowo narzędzie osobiste: nic nie jest udostępniane ani synchronizowane, co oznacza też brak rejestracji i danych na serwerze. Ograniczanie liczby kart w „Doing” to podstawowy nawyk Kanbanu, który ta prosta tablica uwidacznia.`],
[`Dodaj karty w kolumnie „To do”.`,`Przeciągnij je do „Doing” i „Done” (lub użyj strzałek).`,`Skopiuj tablicę jako Markdown, gdy musisz zdać raport.`],
[[`Czy kilka osób może używać tablicy?`,`Nie, jest zapisana w Twojej przeglądarce. Służy do osobistego planowania.`],[`Jak przesuwać karty klawiaturą?`,`Przejdź Tab do karty i użyj przycisków ← i →.`]]],
'tally-counter': [[
`Licz osoby przy drzwiach, głosy na spotkaniu lub rzeczy na półce: ogromny przycisk plus, przycisk minus, krok 1, 2, 5 lub 10 i klawiatura (spacja lub ↑ dodaje, ↓ odejmuje). Liczba jest zapamiętywana po zamknięciu strony.`,
`Licznik jest trzymany w pamięci i zapisywany do localStorage po każdym kliknięciu, więc przeładowanie lub przypadkowe zamknięcie go nie zgubi. Przyciski są duże dla ekranów dotykowych, a skróty wyłączone, gdy piszesz w polu. Nie ma użycia sieci ani konta.`],
[`Naciśnij plus lub spację, by liczyć w górę.`,`Użyj minusa lub ↓, by poprawić pomyłkę.`,`Zeruj, gdy zaczynasz następne liczenie.`],
[[`Czy liczba jest zapisywana?`,`Tak, w tej przeglądarce, dopóki jej nie wyzerujesz lub nie wyczyścisz danych witryn.`],[`Czy mogę liczyć co 5?`,`Tak. Wybierz z listy „Licz co 5” lub 10.`]]],
'markdown-table-of-contents': [[
`Wklej README lub dokument i otrzymaj zagnieżdżoną listę linków do wszystkich nagłówków, gotową do wklejenia na górze. Wybierz poziomy nagłówków, punkty lub numery i opcjonalnie wstaw gotowy spis do dokumentu zaraz po tytule.`,
`Nagłówki są czytane wiersz po wierszu z pominięciem bloków kodu (więc „# comment” w fragmencie powłoki nie jest brany za nagłówek), a formatowanie śródwierszowe, jak linki, kod i wyróżnienia, jest usuwane z tekstu linku. Kotwice podążają za regułami GitHuba: małe litery, usunięta interpunkcja (litery i cyfry każdego języka zostają), spacje zamienione na myślniki, a zdublowane nagłówki dostają przyrostki -1, -2. Inne renderery (GitLab, VS Code, generatory stron statycznych) używają bardzo podobnych, ale nie identycznych reguł, więc przetestuj linki na platformie docelowej.`],
[`Wklej dokument Markdown.`,`Wybierz poziomy nagłówków i styl listy.`,`Skopiuj spis treści do dokumentu.`],
[[`Dlaczego niektóre linki nie działają na mojej stronie?`,`Reguły kotwic różnią się nieco między platformami. To narzędzie używa reguł GitHuba.`],[`Czy nagłówki w blokach kodu są ignorowane?`,`Tak.`]]],
'template-variable-filler': [[
`Napisz szablon raz ze znacznikami jak {{name}} i {{date}} i wpisuj wartości przy każdym użyciu. Pola formularza pojawiają się automatycznie dla każdego symbolu zastępczego, wynik aktualizuje się podczas pisania, a niewypełnione symbole zostają widoczne, by nic nie umknęło.`,
`Szablon jest skanowany pod kątem znaczników {{name}} (w środku dozwolone są litery, cyfry, spacje, kropki, myślniki i podkreślenia), różne nazwy stają się polami wejściowymi w kolejności pojawiania się, a każde wystąpienie jest zastępowane wpisaną wartością. Zastępowanie odbywa się w przeglądarce, więc poufne szczegóły pozostają prywatne. Działa dla e-maili, odpowiedzi wsparcia, umów i promptów AI.`],
[`Napisz szablon z {{symbolami zastępczymi}}.`,`Wypełnij pojawiające się pola.`,`Skopiuj gotowy tekst.`],
[[`Czy symbol może wystąpić kilka razy?`,`Tak. Każde wystąpienie jest zastępowane tą samą wartością.`],[`Co jeśli zostawię pole puste?`,`Symbol zostaje w tekście, więc widzisz, czego brakuje.`]]],
'decision-matrix': [[
`Porównujesz dostawców, oferty pracy lub narzędzia? Wypisz kryteria, nadaj każdemu wagę od 1 do 10, oceń każdą opcję od 0 do 10 według kryterium i zobacz sumę ważoną z wyróżnioną najlepszą opcją. Gdy dwie najwyższe są zbyt blisko, pojawia się uwaga.`,
`Ważona ocena opcji to Σ(ocena × waga) ÷ Σ(wag), co utrzymuje wynik na tej samej skali 0–10. Jawne wagi wymuszają rozmowę o tym, co ważne, zanim opcje zostaną ocenione, i w tym tkwi większość wartości. Macierz to pomoc w myśleniu, nie wyrocznia: jeśli wynik wydaje się zły, prawdopodobnie zła jest któraś waga.`],
[`Ustaw kryteria i ich wagi.`,`Oceń każdą opcję według kryterium.`,`Odczytaj sumy ważone i omów wyniki zbliżone.`],
[[`Jak wybrać wagi?`,`Daj 10 najważniejszemu kryterium i skaluj pozostałe względem niego. Uzgodnij wagi przed ocenianiem.`],[`Czy najwyższy wynik jest zawsze właściwym wyborem?`,`To najlepsze dopasowanie do deklarowanych priorytetów. Liczy się wrażliwość: zmień wagi i zobacz, czy zwycięzca się zmienia.`]]],
'daily-standup-formatter': [[
`Napisz trzy krótkie listy i otrzymaj aktualizację gotową do wklejenia w Slacku, Teams lub e-mailu: pogrubione nagłówki, schludne punkty, puste sekcje wypełnione „Nic do zgłoszenia” lub „Brak”. Wybierz pogrubienie w stylu Slacka, Markdown lub zwykły tekst.`,
`Każdy wiersz jest przycinany, początkowe punkty lub myślniki usuwane, a każda pozycja zapisywana z punktorem. Slack i Teams używają pojedynczych gwiazdek dla pogrubienia, Markdown podwójnych, a zwykły tekst dwukropka, czym zajmuje się opcja formatu. Nic nie jest wysyłane; tekst jest tylko przeformatowywany w przeglądarce. Dobra aktualizacja jest konkretna i krótka: wyniki, nie czynności.`],
[`Napisz, co zrobiłeś, co zrobisz i blokery, po jednej pozycji w wierszu.`,`Wybierz format.`,`Skopiuj aktualizację do czatu.`],
[[`Co czyni dobrą aktualizację standupu?`,`Wyniki zamiast czynności, po jednym wierszu, i blokery wskazujące, kto może pomóc.`],[`Czy działa dla Microsoft Teams?`,`Tak. Użyj formatu Slack/Teams dla pogrubionych nagłówków.`]]],
};
