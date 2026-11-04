export default {
'roi-calculator': [[
`Porovnejte, co jste vložili, s tím, co jste dostali zpět. Zadejte náklady a vrácenou hodnotu a volitelně dobu v letech a kalkulačka ukáže ROI v procentech, čistý zisk a ROI za rok, což umožní srovnat krátké a dlouhé projekty.`,
`ROI = (vrácená hodnota − náklady) ÷ náklady × 100. Roční ROI = (hodnota ÷ náklady)^(1 ÷ roky) − 1, složená roční míra růstu vedoucí od nákladů ke konečné hodnotě. ROI 50 % za dva roky je 22,5 % ročně, ne 25 %. ROI ignoruje riziko a načasování toků; u projektů s více platbami použijte NPV.`],
[`Zadejte investici a vrácenou hodnotu.`,`Volitelně přidejte počet let.`,`Přečtěte si ROI a roční ekvivalent.`],
[[`Je vysoké ROI vždy lepší?`,`Ne nutně: ROI 200 % za 10 let je ročně nižší než 50 % za 1 rok a riziko se liší.`],[`Které náklady zahrnout?`,`Všechny náklady investice včetně času a poplatků, jinak je ROI nadhodnoceno.`]]],
'prorated-rent-calculator': [[
`Když nájem nebo licence začíná uprostřed měsíce, účtuje se jen část měsíce. Zadejte celou měsíční částku a datum začátku a získáte platbu za první měsíc za zbývající dny včetně dne začátku.`,
`Používají se tři metody: skutečné dny (částka × zbývající dny ÷ dny v daném měsíci; únor a 31denní měsíce se liší), 30denní měsíc (běžná konvence v nájmech) a roční sazba (měsíčně × 12 ÷ 365 na den). Kalkulačka ukáže použitý vzorec. Metodu určuje vaše smlouva, použijte tedy tu, která je v ní napsána.`],
[`Zadejte celou měsíční částku a datum nastěhování.`,`Zvolte metodu poměrného účtování podle smlouvy.`,`Zkopírujte platbu a denní sazbu.`],
[[`Účtuje se den nastěhování?`,`Normálně ano, den se počítá jako obsazený.`],[`Proč dává únor vyšší denní sazbu?`,`U metody skutečných dnů má únor méně dní, takže každý den stojí víc.`]]],
'bill-splitter': [[
`Přidejte lidi, vypište každou položku s cenou a zaškrtněte, kdo ji sdílel (nikdo zaškrtnutý znamená všichni). Daň a spropitné se přičtou úměrně tomu, co si kdo objednal, a dostanete jasnou částku na osobu ke zkopírování do skupinového chatu.`,
`Každá položka se dělí rovným dílem mezi lidi, kteří ji sdíleli. Spropitné je procento z položek; daň je pevná částka z účtenky. Obojí se rozdělí úměrně podílu každé osoby na mezisoučtu. Podíly se zaokrouhlí na haléře a zbylé haléře se rozdají tak, aby součet všech podílů přesně odpovídal účtu.`],
[`Zadejte jména lidí.`,`Přidejte položky a zaškrtněte, kdo každou sdílel.`,`Zadejte daň a spropitné a zkopírujte částky.`],
[[`Jak se řeší sdílená jídla?`,`Zaškrtněte každou osobu, která položku sdílela; její cena se mezi ně dělí rovným dílem.`],[`Proč se daň dělí úměrně?`,`Protože kdo si objednal víc, způsobil i víc daně; daň můžete stále zadat jako jednu částku.`]]],
'depreciation-schedule-calculator': [[
`Zadejte pořizovací cenu, zůstatkovou hodnotu a dobu použitelnosti a získáte rozpis rok po roce s náklady, kumulovanými odpisy a účetní hodnotou plus graf. Zvolte rovnoměrné odpisy, zrychlené (dvojité nebo jiný koeficient) nebo metodu součtu číslic let.`,
`Rovnoměrné = (cena − zůstatková hodnota) ÷ doba. Zrychlené = účetní hodnota × koeficient ÷ doba každý rok, přičemž účetní hodnota nikdy neklesne pod zůstatkovou a zbytek se odepíše v posledním roce. Součet číslic let = (cena − zůstatková hodnota) × (doba − rok + 1) ÷ (doba × (doba + 1) ÷ 2). Daňové odpisy se řídí národními tabulkami (MACRS, AfA, odpisové skupiny aj.), které se mohou lišit, proto to potvrďte s účetním.`],
[`Zadejte cenu, zůstatkovou hodnotu a dobu použitelnosti.`,`Zvolte metodu.`,`Zkopírujte rozpis nebo ho stáhněte jako CSV.`],
[[`Která metoda je nejlepší?`,`Rovnoměrná je nejjednodušší. Zrychlené metody odepisují víc brzy a hodí se na majetek, který rychle ztrácí hodnotu.`],[`Co je zůstatková hodnota?`,`Odhadovaná hodnota majetku na konci doby použitelnosti.`]]],
'debt-payoff-planner': [[
`Vypište své dluhy se zůstatkem, úrokem a minimální splátkou, zadejte, kolik můžete celkem měsíčně platit, a porovnejte dvě klasické strategie: lavinu (nejvyšší úrok první) a sněhovou kouli (nejmenší zůstatek první). Uvidíte měsíce do bezdlužnosti, celkové úroky a pořadí, v jakém dluhy mizí.`,
`Každý měsíc se ke každému zůstatku přičtou úroky, na každý dluh se zaplatí minimum a vše, co z rozpočtu zbude, jde na cílový dluh zvolené strategie; když je dluh splacen, jeho minimální splátka se přesune na další cíl. Lavina vždy zaplatí nejméně úroků; sněhová koule se často cítí lépe, protože malé dluhy zmizí brzy. Rozpočet musí pokrýt aspoň všechna minima.`],
[`Zadejte každý dluh na samostatný řádek.`,`Zadejte měsíční rozpočet na splátky.`,`Porovnejte obě strategie a jednu vyberte.`],
[[`Která metoda ušetří víc peněz?`,`Lavina, protože nejdřív splácí nejdražší dluh. Sněhová koule může být lepší, když problémem je motivace.`],[`Co když je můj rozpočet pod minimy?`,`Kalkulačka vám to řekne; dluhy, které rostou rychleji, než splácíte, splatit nelze.`]]],
'churn-calculator': [[
`Měsíční odliv 4 % zní málo, ale znamená, že téměř 40 % zákazníků odejde během roku. Zadejte zákazníky, tržby na zákazníka, měsíční odliv a nové zákazníky měsíčně a uvidíte, jak se vyvíjí základna a měsíční tržby a jak dlouho trvá ztráta poloviny kohorty.`,
`Každý měsíc platí zákazníci = zákazníci × (1 − odliv) + noví zákazníci a tržby na zákazníka rostou o míru expanze. Přežití kohorty po 12 měsících je (1 − odliv)^12, tedy roční odliv = 1 − (1 − měsíční odliv)^12; poločas je ln 0,5 ÷ ln(1 − odliv). Graf ukazuje, zda nové registrace předstihují ztráty.`],
[`Zadejte zákazníky, tržby na zákazníka a odliv.`,`Přidejte nové zákazníky měsíčně a horizont.`,`Přečtěte si prognózu a roční odliv.`],
[[`Jak převést měsíční odliv na roční?`,`1 − (1 − měsíční)^12. Pro 4 % měsíčně je to 38,8 % ročně.`],[`Jaký odliv je dobrý?`,`Pro B2B SaaS pod 1–2 % měsíčně, u spotřebitelských předplatných je běžných 5 % a víc.`]]],
'mileage-reimbursement-calculator': [[
`Zadejte vzdálenost a vyberte sazbu (obchodní sazba IRS, německá cestovní náhrada, britský HMRC, rakouské Kilometergeld a další) nebo vlastní sazbu a získáte náhradu za cestu, volitelně jako cestu tam a zpět.`,
`Částka = vzdálenost × sazba (zdvojnásobená u cesty tam a zpět). Sazby v seznamu jsou hodnoty zveřejněné v době psaní a slouží k orientaci: daňové úřady je pravidelně aktualizují a spojují s podmínkami, jako je jen služební použití, stropy a osvobozené limity. Pro konečné uplatnění vždy ověřte aktuální hodnotu u daňového úřadu nebo v cestovní směrnici zaměstnavatele.`],
[`Vyberte oficiální sazbu nebo zadejte vlastní.`,`Zadejte vzdálenost a podle potřeby zaškrtněte cestu tam a zpět.`,`Zkopírujte částku náhrady.`],
[[`Jsou sazby aktuální?`,`Jsou to poslední zveřejněné hodnoty, které známe. Před podáním ověřte aktuální sazbu.`],[`Mohu uplatnit kilometry za dojíždění do práce?`,`Obvykle ne; pravidla se v zemích liší. Služební cesty mezi pracovišti nebo k zákazníkům se obvykle kvalifikují.`]]],
'tip-calculator': [[
`Zadejte účet a počet lidí a uvidíte spropitné, celkem a částku na osobu pro několik sazeb vedle sebe, abyste mohli zvolit, co je přiměřené pro obsluhu a zemi.`,
`Spropitné = účet × sazba; celkem = účet + spropitné; na osobu = celkem ÷ lidé. Hodnoty se zaokrouhlují na haléře. Zvyklosti se liší: 15–20 % je standard v USA a Kanadě, 5–10 % nebo zaokrouhlení nahoru je typické v velké části Evropy a v některých zemích je obsluha už zahrnuta nebo se spropitné neočekává.`],
[`Zadejte účet a počet lidí.`,`Podle libosti upravte seznam sazeb spropitného.`,`Přečtěte si spropitné, celkem a podíl na osobu.`],
[[`Počítá se spropitné z částky před daní?`,`Mnoho lidí dává spropitné z mezisoučtu před daní; zadejte tuto částku jako účet.`],[`Kolik spropitného dát v Česku?`,`Obvykle zaokrouhlit nahoru nebo přidat 5–10 % při dobré obsluze.`]]],
};
