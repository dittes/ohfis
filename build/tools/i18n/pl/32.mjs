const E = 'Wideo jest przetwarzane przez FFmpeg, standardowe otwartoźródłowe narzędzie wideo skompilowane do WebAssembly i działające w Twojej przeglądarce. Przy pierwszym użyciu pobierany jest silnik (około 31 MB), który przeglądarka potem zachowuje. Nic nie jest przesyłane.';
const L = 'Wszystko dzieje się w pamięci przeglądarki, więc bardzo duże wideo (kilka gigabajtów) lub długie klipy 4K mogą się nie udać na telefonie lub starszym komputerze; spróbuj wtedy krótszego lub mniejszego klipu.';
export default {
'video-trimmer': [[
`Przeciągnij wideo, odtwórz je, zatrzymaj tam, gdzie potrzebna część się zaczyna i kończy, naciśnij „użyj bieżącej pozycji” i zapisz przycięte wideo. Tryb szybki kopiuje strumienie bez ponownego kodowania, więc nawet długie wideo jest cięte w kilka sekund bez utraty jakości; cięcie przyciąga wtedy do najbliższej klatki kluczowej. Tryb zwykły koduje ponownie i jest dokładny co do klatki.`,
`${E} ${L}`],
[`Przeciągnij wideo i odtwórz je.`,`Ustaw początek i koniec (lub użyj bieżącej pozycji odtwarzacza).`,`Wybierz tryb szybki lub dokładny i naciśnij „Przytnij wideo”.`],
[[`Dlaczego cięcie w trybie szybkim jest nieco niedokładne?`,`Bez ponownego kodowania wideo może zaczynać się tylko od klatki kluczowej, która występuje zwykle co jedną do pięciu sekund. Wyłącz tryb szybki, by ciąć co do klatki.`],[`Jakie formaty mogę otworzyć?`,`MP4, MOV, WebM, MKV, AVI i większość formatów z telefonów i kamer. Wynik to zawsze MP4 (H.264).`]]],
'video-merger': [[
`Dodaj dwa lub więcej klipów, ułóż je przyciskami strzałek i otrzymaj jedno wideo. Klipy o innym rozmiarze lub liczbie klatek są wpasowywane w jedną ramkę (rozmiar pierwszego klipu lub wybrany) z czarnymi pasami, więc klip z telefonu i nagranie ekranu można połączyć bez zniekształceń.`,
`Dźwięk jest łączony także; jeśli któryś klip nie ma ścieżki dźwiękowej, dźwięk wszystkich klipów jest pomijany, a narzędzie informuje o tym. ${E} ${L}`],
[`Dodaj klipy wideo.`,`Ułóż je i wybierz rozmiar ramki.`,`Naciśnij „Połącz wideo” i pobierz wynik.`],
[[`Czy klipy muszą mieć ten sam rozmiar?`,`Nie. Każdy klip jest skalowany do wybranej ramki i dopełniany czarnymi pasami, gdy kształt się różni.`],[`Czy mogę dodać przejścia?`,`Nie w tym narzędziu: klipy są łączone twardym cięciem.`]]],
'video-converter': [[
`Przeciągnij wideo i zamień je na MP4 (H.264, działa na każdym telefonie, telewizorze i w przeglądarce), WebM (VP8, dla stron), animowany GIF lub plik audio (MP3, M4A, WAV). Możesz ograniczyć szerokość, usunąć dźwięk i wybrać między szybkim a wysokiej jakości kodowaniem.`,
`Konwersja to zwykłe rozwiązanie, gdy wideo nie odtwarza się lub nie da się go gdzieś wgrać: MOV z iPhone'a, MKV lub AVI ze starszych kamer i pobrań stają się zwykłym MP4. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wybierz format docelowy i w razie potrzeby maksymalną szerokość.`,`Naciśnij „Konwertuj” i pobierz plik.`],
[[`Jaki format wybrać?`,`MP4 do prawie wszystkiego. WebM dla stron preferujących otwarte formaty. GIF tylko dla krótkich cichych pętli. MP3, jeśli potrzebujesz samego dźwięku.`],[`Czy jakość się pogarsza?`,`Ponowne kodowanie zawsze coś traci. „Wysoka jakość” utrzymuje obraz wizualnie bardzo blisko oryginału; jest wolniejsza i daje większy plik.`]]],
'video-compressor': [[
`Przeciągnij wideo, wybierz siłę kompresji i, jeśli obraz nie musi być duży, mniejszą wysokość, np. 720p, a otrzymasz znacznie mniejszy MP4. Wideo z telefonu o rozmiarze 500 MB często kurczy się do jednej piątej bez widocznej straty przy udostępnianiu.`,
`Narzędzie koduje ponownie w H.264 z ustawieniem stałej jakości (CRF): im wyższa liczba, tym mniejszy plik. 23 wygląda niemal jak oryginał, 28 to dobry kompromis dla czatu i e-maila, powyżej 33 strata jest wyraźna. Wolniejsze ustawienie prędkości daje nieco mniejszy plik przy tej samej jakości, ale trwa dłużej. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wybierz jakość (CRF) i w razie potrzeby maksymalną wysokość.`,`Naciśnij „Kompresuj wideo” i porównaj rozmiary.`],
[[`Jak mały będzie plik?`,`To zależy od zawartości. Porównaj liczby „Przed” i „Wynik”; spróbuj najpierw CRF 28 z 720 p.`],[`Czy mogę skompresować do dokładnego rozmiaru, np. 10 MB?`,`Nie dokładnie. Zwiększaj CRF i obniżaj wysokość, aż wynik zmieści się w limicie.`]]],
'video-crop-rotate-flip': [[
`Popraw wideo z telefonu nagrane bokiem, przytnij klip poziomy do pionowego formatu 9:16 dla Stories i Reels, zrób kwadratową wersję 1:1 lub odbij wideo z selfie. Przytnij do standardowych proporcji wokół środka albo narysuj dokładny prostokąt (czerwona ramka na podglądzie pokazuje, co zostaje), potem obróć co 90° i odbij poziomo lub pionowo.`,
`Najpierw stosowane jest przycięcie, potem obrót i odbicie. Wynik jest kodowany ponownie jako MP4; wymiary są zaokrąglane do liczb parzystych, czego wymaga format wideo. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wybierz przycięcie (proporcje lub prostokąt), obrót i odbicia.`,`Naciśnij „Zastosuj” i pobierz.`],
[[`Moje wideo z telefonu odtwarza się bokiem.`,`Wybierz obrót o 90° lub 270°, aż będzie dobrze; wynik jest zapisywany z właściwą orientacją.`],[`Jak zrobić wideo pionowe z poziomego?`,`Wybierz „Do proporcji” z 9:16. Środek obrazu zostaje; użyj trybu prostokąta, by wybrać inną część.`]]],
'video-resizer': [[
`Wybierz standardową wysokość, np. 1080p, 720p lub 480p, szerokość albo dokładną szerokość i wysokość i otrzymaj przeskalowany MP4. Mniejsze wideo szybciej się wysyła, zajmuje mniej miejsca i płynnie odtwarza się przy słabym łączu.`,
`Przy standardowej wysokości lub szerokości drugi wymiar jest obliczany tak, by zachować proporcje; „dokładny” ustawia oba i może rozciągnąć obraz. Powiększenie wideo nie dodaje szczegółów. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wybierz wysokość, szerokość lub dokładny rozmiar.`,`Naciśnij „Zmień rozmiar wideo” i pobierz.`],
[[`Jaki rozmiar wybrać?`,`1080p do ogólnego użytku, 720p do e-maila i czatu, 480p lub mniej dla bardzo małych plików.`],[`Czy skalowanie zmniejsza też plik?`,`Zwykle znacznie, bo do zapisania jest mniej pikseli. Użyj kompresji wideo, by sterować rozmiarem pliku bezpośrednio.`]]],
'video-speed-changer': [[
`Wpisz prędkość od 0,1× do 20×: 0,5 odtwarza z połową prędkości (zwolnione tempo), 2 dwa razy szybciej, 8 robi z długiego nagrania timelapse. Dźwięk jest dostosowany do tej samej prędkości bez zmiany wysokości tonu.`,
`Czas obrazu jest zmieniany filtrem setpts FFmpeg, a dźwięk łańcuchem filtrów atempo (każdy etap obsługuje tylko współczynniki od 0,5 do 2, więc skrajne prędkości używają kilku). Zwolnione tempo nie wymyśli nowych klatek, więc bardzo wolny klip może wyglądać skokowo. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wpisz prędkość (poniżej 1 = wolniej, powyżej 1 = szybciej).`,`Naciśnij „Zmień prędkość” i pobierz.`],
[[`Czy głos brzmi jak wiewiórka?`,`Nie. Wysokość tonu jest zachowana, więc głosy brzmią naturalnie przy umiarkowanych prędkościach; przy skrajnych mowa staje się trudna do zrozumienia.`],[`Czy mogę zmienić prędkość tylko części wideo?`,`Wytnij część narzędziem do przycinania wideo, zmień jej tempo tutaj i połącz kawałki łącznikiem wideo.`]]],
'video-loop': [[
`Wpisz, ile razy klip ma być odtworzony łącznie (od 2 do 200), i otrzymaj dłuższe wideo: na pętlę w tle na ekranie, klip medytacyjny lub ambientowy albo krótką animację, która ma trwać minuty.`,
`Tryb szybki powtarza klip bez ponownego kodowania, więc kończy w kilka sekund bez strat; jeśli odtwarzacz ma problem z wynikiem, wyłącz go, by zakodować ponownie. Bardzo długie wyniki stają się duże, więc sprawdź długość przed startem. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wpisz, ile razy ma być odtwarzane.`,`Naciśnij „Utwórz pętlę” i pobierz.`],
[[`Czy pętla jest płynna?`,`Plik po prostu odtwarza klip ponownie od początku. Jeśli koniec nie pasuje do początku, przytnij klip tak, by pasował.`],[`Czy mogę zrobić nieskończoną pętlę?`,`Plik zawsze ma koniec. Użyj dużej liczby powtórzeń lub opcji „pętla” w odtwarzaczu.`]]],
};
