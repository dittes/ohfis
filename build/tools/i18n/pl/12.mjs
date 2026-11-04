export default {
'roi-calculator': [[
`Porównaj to, co włożyłeś, z tym, co dostałeś z powrotem. Wpisz koszt i zwróconą wartość oraz opcjonalnie czas w latach, a kalkulator pokaże ROI w procentach, zysk netto i ROI na rok, co pozwala porównywać krótkie i długie projekty.`,
`ROI = (zwrócona wartość − koszt) ÷ koszt × 100. Roczny ROI = (wartość ÷ koszt)^(1 ÷ lata) − 1, czyli złożona roczna stopa wzrostu prowadząca od kosztu do wartości końcowej. ROI 50% w dwa lata to 22,5% rocznie, nie 25%. ROI ignoruje ryzyko i moment przepływów; dla projektów z wieloma płatnościami użyj NPV.`],
[`Wpisz inwestycję i zwróconą wartość.`,`Opcjonalnie dodaj liczbę lat.`,`Odczytaj ROI i odpowiednik roczny.`],
[[`Czy wysokie ROI jest zawsze lepsze?`,`Niekoniecznie: ROI 200% przez 10 lat jest rocznie niższe niż 50% w rok, a ryzyko bywa różne.`],[`Jakie koszty uwzględnić?`,`Wszystkie koszty inwestycji, także czas i opłaty, inaczej ROI jest zawyżone.`]]],
'prorated-rent-calculator': [[
`Gdy najem lub licencja zaczyna się w środku miesiąca, naliczana jest tylko część miesiąca. Wpisz pełną kwotę miesięczną i datę rozpoczęcia, a otrzymasz opłatę za pierwszy miesiąc za pozostałe dni, łącznie z dniem rozpoczęcia.`,
`Stosowane są trzy metody: rzeczywiste dni (kwota × pozostałe dni ÷ dni w tym miesiącu; luty i miesiące 31-dniowe różnią się), miesiąc 30-dniowy (częsta konwencja w umowach najmu) i stawka roczna (miesięcznie × 12 ÷ 365 na dzień). Kalkulator pokazuje użyty wzór. O metodzie decyduje umowa, więc użyj tej, która jest w niej zapisana.`],
[`Wpisz pełną kwotę miesięczną i datę wprowadzenia.`,`Wybierz metodę proporcjonalnego naliczania z umowy.`,`Skopiuj opłatę i stawkę dzienną.`],
[[`Czy dzień wprowadzenia jest naliczany?`,`Zwykle tak, dzień liczy się jako zajęty.`],[`Dlaczego luty daje wyższą stawkę dzienną?`,`W metodzie rzeczywistych dni luty ma mniej dni, więc każdy dzień kosztuje więcej.`]]],
'bill-splitter': [[
`Dodaj osoby, wypisz każdą pozycję z ceną i zaznacz, kto się nią dzielił (brak zaznaczeń oznacza wszystkich). Podatek i napiwek są doliczane proporcjonalnie do tego, co zamówił każdy, a Ty dostajesz jasną kwotę na osobę do skopiowania na czat grupowy.`,
`Każda pozycja jest dzielona po równo między osoby, które się nią dzieliły. Napiwek to procent od pozycji; podatek to stała kwota z paragonu. Oba są rozdzielane proporcjonalnie do udziału każdej osoby w sumie częściowej. Udziały są zaokrąglane do grosza, a pozostałe grosze rozdawane tak, by suma wszystkich udziałów dokładnie równała się rachunkowi.`],
[`Wpisz imiona osób.`,`Dodaj pozycje i zaznacz, kto dzielił każdą.`,`Wpisz podatek i napiwek i skopiuj kwoty.`],
[[`Jak traktowane są dania do dzielenia?`,`Zaznacz każdą osobę, która dzieliła pozycję; jej cena jest dzielona po równo między nie.`],[`Dlaczego podatek jest dzielony proporcjonalnie?`,`Bo kto zamówił więcej, spowodował też więcej podatku; podatek możesz nadal wpisać jako jedną kwotę.`]]],
'depreciation-schedule-calculator': [[
`Wpisz koszt, wartość końcową i okres użytkowania, a otrzymasz harmonogram rok po roku z kosztem, skumulowaną amortyzacją i wartością księgową oraz wykres. Wybierz metodę liniową, degresywną (podwójną lub z innym współczynnikiem) lub sumy cyfr lat.`,
`Liniowa = (koszt − wartość końcowa) ÷ okres. Degresywna = wartość księgowa × współczynnik ÷ okres w każdym roku, nigdy nie obniżając wartości księgowej poniżej wartości końcowej i odpisując resztę w ostatnim roku. Suma cyfr lat = (koszt − wartość końcowa) × (okres − rok + 1) ÷ (okres × (okres + 1) ÷ 2). Amortyzacja podatkowa wynika z krajowych tabel (MACRS, AfA itp.), które mogą się różnić, więc potwierdź z księgowym.`],
[`Wpisz koszt, wartość końcową i okres użytkowania.`,`Wybierz metodę.`,`Skopiuj harmonogram lub pobierz jako CSV.`],
[[`Która metoda jest najlepsza?`,`Liniowa jest najprostsza. Metody przyspieszone odpisują więcej na początku, pasując do składników tracących wartość szybko.`],[`Czym jest wartość końcowa?`,`Szacowana wartość środka trwałego na koniec okresu użytkowania.`]]],
'debt-payoff-planner': [[
`Wypisz długi z saldem, oprocentowaniem i minimalną ratą, wpisz, ile możesz łącznie płacić miesięcznie, i porównaj dwie klasyczne strategie: lawinę (najwyższe oprocentowanie najpierw) i kula śnieżna (najmniejsze saldo najpierw). Zobaczysz miesiące do wolności od długów, łączne odsetki i kolejność znikania długów.`,
`Co miesiąc do każdego salda doliczane są odsetki, na każdy dług płacona jest rata minimalna, a wszystko, co zostaje z budżetu, idzie na dług docelowy wybranej strategii; gdy dług jest spłacony, jego rata minimalna przechodzi na następny cel. Lawina zawsze płaci najmniej odsetek; kula śnieżna często daje lepsze odczucie, bo małe długi znikają wcześnie. Budżet musi pokrywać co najmniej wszystkie raty minimalne.`],
[`Wpisz każdy dług w osobnym wierszu.`,`Wpisz miesięczny budżet na spłaty.`,`Porównaj obie strategie i wybierz jedną.`],
[[`Która metoda oszczędza więcej pieniędzy?`,`Lawina, bo najpierw spłaca najdroższy dług. Kula śnieżna może być lepsza, gdy problemem jest motywacja.`],[`Co jeśli mój budżet jest poniżej rat minimalnych?`,`Kalkulator Ci to powie; nie spłacisz długów, które rosną szybciej, niż płacisz.`]]],
'churn-calculator': [[
`Miesięczny odpływ 4% brzmi niewiele, ale oznacza, że prawie 40% klientów odchodzi w ciągu roku. Wpisz klientów, przychód na klienta, miesięczny odpływ i nowych klientów miesięcznie, by zobaczyć rozwój bazy i miesięcznych przychodów oraz to, jak długo trwa utrata połowy kohorty.`,
`Co miesiąc klienci = klienci × (1 − odpływ) + nowi klienci, a przychód na klienta rośnie o stopę ekspansji. Przeżywalność kohorty po 12 miesiącach to (1 − odpływ)^12, więc odpływ roczny = 1 − (1 − odpływ miesięczny)^12; okres półtrwania to ln 0,5 ÷ ln(1 − odpływ). Wykres pokazuje, czy rejestracje wyprzedzają straty.`],
[`Wpisz klientów, przychód na klienta i odpływ.`,`Dodaj nowych klientów miesięcznie i horyzont.`,`Odczytaj prognozę i odpływ roczny.`],
[[`Jak zamienić odpływ miesięczny na roczny?`,`1 − (1 − miesięczny)^12. Dla 4% miesięcznie to 38,8% rocznie.`],[`Jaki odpływ jest dobry?`,`Dla B2B SaaS poniżej 1–2% miesięcznie, dla subskrypcji konsumenckich 5% lub więcej jest częste.`]]],
'mileage-reimbursement-calculator': [[
`Wpisz dystans i wybierz stawkę (stawka biznesowa IRS, niemiecka dieta podróżna, brytyjski HMRC, austriackie Kilometergeld i inne) lub własną stawkę, aby otrzymać zwrot za przejazd, opcjonalnie jako podróż w obie strony.`,
`Kwota = dystans × stawka (podwojona dla podróży w obie strony). Stawki na liście to wartości opublikowane w czasie pisania i służą orientacji: urzędy skarbowe regularnie je aktualizują i dołączają warunki, jak użytek wyłącznie służbowy, limity i granice zwolnienia z podatku. Przy ostatecznym rozliczeniu zawsze sprawdź aktualną wartość w urzędzie skarbowym lub w polityce podróży pracodawcy.`],
[`Wybierz oficjalną stawkę lub wpisz własną.`,`Wpisz dystans i zaznacz podróż w obie strony, jeśli trzeba.`,`Skopiuj kwotę zwrotu.`],
[[`Czy stawki są aktualne?`,`To ostatnie znane nam opublikowane wartości. Sprawdź aktualną stawkę przed złożeniem.`],[`Czy mogę rozliczyć kilometry na dojazd do pracy?`,`Zwykle nie; zasady różnią się w zależności od kraju. Podróże służbowe między lokalizacjami lub do klientów zwykle się kwalifikują.`]]],
'tip-calculator': [[
`Wpisz rachunek i liczbę osób, aby zobaczyć napiwek, sumę i kwotę na osobę dla kilku stawek obok siebie, i wybrać odpowiednią dla obsługi i kraju.`,
`Napiwek = rachunek × stawka; razem = rachunek + napiwek; na osobę = razem ÷ osoby. Wartości są zaokrąglane do groszy. Zwyczaje się różnią: 15–20% to standard w Stanach i Kanadzie, 5–10% lub zaokrąglenie w górę jest typowe w dużej części Europy, a w niektórych krajach obsługa jest już wliczona lub napiwek nie jest oczekiwany.`],
[`Wpisz rachunek i liczbę osób.`,`Edytuj listę stawek napiwku, jeśli chcesz.`,`Odczytaj napiwek, sumę i udział na osobę.`],
[[`Czy napiwek liczy się od kwoty przed podatkiem?`,`Wiele osób daje napiwek od sumy przed podatkiem; wpisz tę kwotę jako rachunek.`],[`Ile dać napiwku w Polsce?`,`Zwykle 10% lub zaokrąglenie w górę przy dobrej obsłudze.`]]],
};
