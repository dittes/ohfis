const E = 'Wideo jest przetwarzane przez FFmpeg, standardowe otwartoźródłowe narzędzie wideo skompilowane do WebAssembly i działające w Twojej przeglądarce. Przy pierwszym użyciu pobierany jest silnik (około 31 MB), który przeglądarka potem zachowuje. Nic nie jest przesyłane.';
const L = 'Wszystko dzieje się w pamięci przeglądarki, więc bardzo duże wideo (kilka gigabajtów) lub długie klipy 4K mogą się nie udać na telefonie lub starszym komputerze; spróbuj wtedy krótszego lub mniejszego klipu.';
export default {
'video-volume-changer': [[
`Zwiększ lub zmniejsz głośność wideo o liczbę decybeli albo całkowicie usuń dźwięk. +6 dB to mniej więcej dwa razy głośniej, −6 dB o połowę ciszej. Przydatne przy zbyt cichym nagraniu, wideo z głośną muzyką lub takim, które ma być ciche, zanim dodasz własną muzykę.`,
`Obraz jest kopiowany bez ponownego kodowania, więc narzędzie jest szybkie, a jakość obrazu pozostaje nietknięta; przetwarzany jest tylko dźwięk. Zbyt mocne podbicie zniekształca głośne fragmenty, więc posłuchaj wyniku. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wpisz zmianę głośności w dB lub zaznacz „usuń dźwięk”.`,`Naciśnij „Zastosuj” i pobierz.`],
[[`Czy mogę wyciszyć tylko część?`,`Podziel wideo na części narzędziem do przycinania, wycisz jedną i połącz je z powrotem łącznikiem wideo.`],[`Wynik jest nadal za cichy.`,`Zwiększ wartość dalej albo wyciągnij dźwięk, znormalizuj go normalizatorem audio i dodaj z powrotem przez „Dodaj dźwięk do wideo”.`]]],
'video-add-audio': [[
`Wybierz wideo i plik audio (MP3, M4A, WAV, OGG, FLAC) i albo zastąp oryginalny dźwięk, albo zmiksuj oba, z osobnymi regulatorami głośności. Dobre do podłożenia muzyki pod niemy klip lub lektora pod nagranie ekranu.`,
`Obraz jest kopiowany bez ponownego kodowania; audio jest konwertowane do AAC. Domyślnie wynik kończy się wraz z krótszym z dwóch, więc długa piosenka nie wydłuża krótkiego wideo; odznacz opcję, by audio grało dalej na zatrzymanej ostatniej klatce. ${E} ${L}`],
[`Przeciągnij wideo i wybierz plik audio.`,`Wybierz zastąpienie lub miks i ustaw głośności.`,`Naciśnij „Dodaj dźwięk” i pobierz.`],
[[`Muzyka jest dłuższa niż wideo.`,`Zostaw zaznaczone „zakończ z krótszym”: wynik kończy się, gdy kończy się wideo. Najpierw użyj narzędzia do cięcia audio, jeśli chcesz konkretny fragment piosenki.`],[`Moje wideo nie ma dźwięku. Czy miksowanie działa?`,`Tak, audio jest po prostu dodawane jako jedyny dźwięk.`]]],
'video-add-text': [[
`Wpisz tekst, wybierz rozmiar, kolor i jedną z dziewięciu pozycji, opcjonalnie ciemne pole pod spodem dla czytelności oraz czas początku i końca, a otrzymasz wideo z wypalonym tekstem. Dobre do tytułów, podpisów, nazwiska, daty lub wezwania do działania.`,
`Tekst jest rysowany czcionką DejaVu Sans, która obejmuje litery łacińskie (w tym polskie znaki i akcenty), greckie i cyrylicę; emoji i pism azjatyckich nie ma. Dla napisów podążających za mową użyj osobnego edytora napisów. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wpisz tekst i wybierz rozmiar, kolor i pozycję.`,`W razie potrzeby ustaw zakres czasu, naciśnij „Dodaj tekst” i pobierz.`],
[[`Czy mogę pokazać tekst tylko przez kilka sekund?`,`Tak. Wpisz „od” i „do” w sekundach; użyj przycisków „bieżąca pozycja”, gdy wideo jest zatrzymane w odpowiednim momencie.`],[`Czy mogę dodać kilka tekstów?`,`Jeden na przebieg. Przepuść wynik przez narzędzie jeszcze raz, by dodać kolejny.`]]],
'video-add-image': [[
`Wybierz wideo i obraz (dla logo najlepszy jest PNG z przezroczystym tłem), wybierz jedną z dziewięciu pozycji, rozmiar jako udział szerokości wideo, przezroczystość i opcjonalnie, kiedy ma się pojawić. Użyj do oznaczania własnych filmów znakiem wodnym lub dodania logo kanału.`,
`Obraz jest skalowany względem wideo, więc jedno ustawienie działa dla klipów o różnych rozdzielczościach. Wideo jest kodowane ponownie jako MP4, dźwięk zostaje. ${E} ${L}`],
[`Przeciągnij wideo i wybierz obraz.`,`Ustaw pozycję, rozmiar, przezroczystość i czas.`,`Naciśnij „Dodaj obraz” i pobierz.`],
[[`Jaki format obrazu jest najlepszy?`,`PNG z przezroczystym tłem. JPG i WebP też działają, ale nie mają przezroczystości (WebP i GIF mogą).`],[`Czy mogę pokazać logo tylko na początku?`,`Tak. Ustaw „pokaż do” na liczbę sekund, przez którą ma zostać.`]]],
'video-logo-remover': [[
`Wpisz pozycję i rozmiar logo (czerwona ramka na podglądzie pokazuje obszar), a obszar zostanie wypełniony z otoczenia. Działa dobrze dla małych, statycznych logo na spokojnym tle, jak znak w rogu własnego materiału lub znacznik czasu.`,
`Narzędzie używa filtru delogo z FFmpeg, który interpoluje obszar z otaczających pikseli; nie odtworzy dużej lub nieregularnej części obrazu i zostawia lekkie rozmycie. Usuwaj logo tylko z materiału, który jest Twój lub który wolno Ci edytować. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wpisz lewy margines, górę, szerokość i wysokość obszaru logo i sprawdź czerwoną ramkę.`,`Naciśnij „Usuń logo” i pobierz.`],
[[`Logo jest nadal widoczne.`,`Zrób ramkę nieco większą niż logo, wraz z jego krawędziami i ewentualnym cieniem.`],[`Czy działa przy ruchomym logo?`,`Tylko jeśli obszar obejmuje wszystkie pozycje logo; im większy obszar, tym bardziej widoczne rozmycie.`]]],
'video-to-gif': [[
`Wybierz, gdzie GIF się zaczyna, jak długo trwa, klatki na sekundę i szerokość, a otrzymasz animowany GIF. Kilka sekund przy 10–15 klatkach na sekundę i 480 px szerokości daje poręczny GIF reakcji lub demonstracji.`,
`Kolory pochodzą z palety utworzonej dokładnie dla tego klipu (filtry palettegen i paletteuse z FFmpeg), co wygląda znacznie lepiej niż domyślny GIF o 256 kolorach. GIF-y szybko rosną wraz z długością, rozmiarem i liczbą klatek; dla czegokolwiek dłuższego niż kilka sekund krótki MP4 jest znacznie mniejszy. ${E} ${L}`],
[`Przeciągnij wideo i ustaw początek przyciskiem „użyj bieżącej pozycji”.`,`Wybierz długość, liczbę klatek i szerokość.`,`Naciśnij „Utwórz GIF” i pobierz.`],
[[`GIF jest ogromny.`,`Skróć go i obniż liczbę klatek do 8–10 oraz szerokość do 320–480 px.`],[`Czy jest dźwięk?`,`Nie. Format GIF nie ma dźwięku.`]]],
'video-stabilizer': [[
`Przeciągnij drżący klip z ręki i otrzymaj spokojniejszą wersję. Ustaw, jak duże drżenie może być korygowane (zakres wyszukiwania w pikselach) i czy krawędzie powstające przy przesunięciu obrazu są wypełniane odbiciem czy zostają czarne.`,
`Ta przeglądarkowa wersja używa podstawowego filtru „deshake” z FFmpeg. Wyrównuje małe, szybkie drgania, ale nie naprawi silnego trzęsienia, falowania rolling shutter ani idącej kamery tak jak gimbale telefonów czy specjalne dwuprzebiegowe stabilizatory; obraz jest też lekko przesuwany, co może dawać widoczne krawędzie. ${E} ${L}`],
[`Przeciągnij wideo.`,`Wybierz zakres wyszukiwania i obsługę krawędzi.`,`Naciśnij „Stabilizuj”, porównaj z oryginałem i pobierz.`],
[[`Wynik nadal się trzęsie.`,`Zwiększ zakres wyszukiwania. Przy silnym drżeniu nagrywaj ze statywem lub w trybie stabilizacji telefonu.`],[`Skąd dziwne krawędzie?`,`By zniwelować ruch, obraz jest przesuwany. Wybierz „Wypełnij odbiciem” lub lekko przytnij wynik.`]]],
};
