export default {
'vat-calculator': [[
`Rozdělte účtenku na základ a DPH nebo přidejte DPH k ceně. Vyberte svou zemi a uvidíte její aktuální základní a snížené sazby, nebo zadejte libovolnou sazbu – funguje stejně pro GST, daň z prodeje i MwSt.`,
`Z částky s daní: základ = celkem ÷ (1 + sazba) a DPH = celkem − základ (ne celkem × sazba, častá chyba, která daň nadhodnotí). Ze základu: DPH = základ × sazba a celkem = základ + DPH. Seznam sazeb slouží k orientaci a v čase se mění, proto sazbu platnou pro váš produkt potvrďte u finančního úřadu.`],
[`Zadejte částku a zvolte, zda obsahuje DPH.`,`Vyberte zemi nebo zadejte sazbu.`,`Zkopírujte základ, DPH a celkem.`],
[[`Jak spočítat DPH z ceny s daní?`,`Vydělte cenu s daní číslem 1 + sazba (1,21 pro 21 %) a získáte cenu bez daně. Rozdíl je DPH.`],[`Je 21 % ze 121 DPH?`,`Ne. 21 % ze 121 je 25,41, ale DPH obsažené ve 121 je 21,00, protože 121 už daň obsahuje.`]]],
'npv-irr-calculator': [[
`Ohodnoťte projekt zadáním diskontní sazby a seznamu peněžních toků, s investicí jako záporným číslem na prvním místě. Výsledkem je čistá současná hodnota (NPV), vnitřní výnosové procento (IRR), diskontovaná doba návratnosti a tabulka diskontních faktorů.`,
`NPV = Σ tok(t) ÷ (1 + r)^t, kde první tok je v t = 0 (nediskontovaný). IRR je sazba, při které je NPV nulová, nalezená půlením intervalu s vysokou přesností; ohlásí se jako „bez řešení“, pokud toky nikdy nezmění znaménko. Diskontovaná návratnost interpoluje bod, kdy se kumulovaná současná hodnota stane kladnou. Pozor, funkce NPV v Excelu první hodnotu diskontuje o jedno období, takže počáteční investici přičtěte mimo funkci.`],
[`Zadejte diskontní sazbu.`,`Vypište toky, jeden na období, investice první.`,`Přečtěte si NPV, IRR a návratnost.`],
[[`Co znamená kladná NPV?`,`Projekt vydělává víc než váš požadovaný výnos, takže přidává hodnotu.`],[`Proč Excel dává jinou NPV?`,`Excel bere první hodnotu jako období 1. Tato kalkulačka ji bere jako dnešek, jako většina učebnic.`]]],
'rule-of-72-calculator': [[
`Vydělte 72 roční sazbou a získáte přibližný počet let, za které se investice zdvojnásobí: při 8 % asi 9 let. Kalkulačka ukazuje tento odhad vedle přesné doby zdvojnásobení, chyby a tabulky běžných sazeb.`,
`Přesná doba je ln 2 ÷ ln(1 + sazba); pro malé sazby je ln(1 + r) ≈ r, což dává 69,3 ÷ sazba. 72 se používá místo 69,3, protože má mnoho dělitelů a vyrovnává úročení při typických sazbách 6–10 %, kde se od přesné hodnoty liší asi o 0,3 %. Pro spojitý růst je pravidlo 69,3 přesné. Totéž pravidlo platí pro inflaci: při 3 % se ceny zdvojnásobí za 24 let.`],
[`Zadejte roční sazbu.`,`Přečtěte si odhad a přesnou hodnotu.`,`V tabulce porovnejte další sazby.`],
[[`Jak přesné je pravidlo 72?`,`Velmi dobré mezi 6 % a 10 %; při 2 % nebo 20 % chyba roste na několik procent.`],[`Mohu ho použít pro inflaci?`,`Ano: 72 ÷ míra inflace dává roky do zdvojnásobení cen.`]]],
'tiered-pricing-calculator': [[
`Vyzkoušejte ceník, než ho zveřejníte. Zadejte pásma jako „od množství, jednotková cena“ a množství a uvidíte součet, průměrnou cenu za jednotku, rozpis podle pásem a graf ceny proti množství.`,
`Běžné jsou dva modely. Při odstupňované ceně (graduated) se každá jednotka účtuje cenou pásma, do kterého spadá (prvních 100 po 10, dalších 400 po 8). Při objemové ceně dosažené pásmo určí cenu všech jednotek (600 jednotek všechny po 5). Objemová cena vytváří útesy, kdy nákup většího množství stojí celkem méně, odstupňovaná cena je plynulá. Graf takové efekty zviditelní.`],
[`Zadejte pásma, jedno na řádek.`,`Zvolte odstupňovanou nebo objemovou cenu a množství.`,`Zkontrolujte rozpis a graf, zda neobsahují divné skoky.`],
[[`Jaký je rozdíl mezi odstupňovanou a objemovou cenou?`,`Odstupňovaná použije každou cenu jen na jednotky uvnitř svého pásma; objemová použije cenu dosaženého pásma na každou jednotku.`],[`Proč stojí 101 jednotek při objemové ceně méně než 100?`,`To je efekt útesu; abyste se mu vyhnuli, použijte odstupňovanou cenu nebo upravte ceny pásem.`]]],
'sales-commission-calculator': [[
`Zadejte dosažený prodej, plán a pásma provize a uvidíte výplatu, plnění plánu a rozpis po pásmech. Typické plány platí základní sazbu do plánu a akcelerátory nad ním.`,
`Každé pásmo se vztahuje na část prodeje mezi jeho dolní a horní mezí, vyjádřenou jako procento plánu, jako pásma daně z příjmu: s pásmy 0–100 % po 5 % a 100–150 % po 8 % vyplatí prodej 130 % plánu 100 000 právě 100 000 × 5 % + 30 000 × 8 % = 7 400. Poslední pásmo může být otevřené (*). Efektivní sazba ukazuje průměrnou sazbu ze všeho prodeje.`],
[`Zadejte prodej a plán.`,`Definujte pásma jako „do % plánu, sazba %“.`,`Přečtěte si provizi a rozpis.`],
[[`Co je akcelerátor?`,`Vyšší sazba provize z prodeje nad plán, která odměňuje překročení.`],[`Vztahují se pásma na všechen prodej, nebo jen na část uvnitř?`,`Jen na část uvnitř pásma, jako daňová pásma.`]]],
'payment-processing-fee-calculator': [[
`Najděte nejlevnější způsob, jak dostávat platby. Zadejte typickou platbu a počet plateb měsíčně; tabulka seřadí zpracovatele podle poplatku, ukáže, kolik skutečně dostanete, efektivní sazbu a roční náklad a částku, kterou byste museli účtovat, abyste dostali přesně 100.`,
`Každý zpracovatel účtuje procento plus pevný poplatek: poplatek = částka × % + pevný. Efektivní sazba je u malých plateb vyšší, protože pevná část váží víc. Sloupec „účtovat pro 100“ částku navyšuje: (100 + pevný) ÷ (1 − %). Předvyplněné sazby jsou veřejné ceníky a jen výchozí bod: upravte seznam podle své smlouvy, mixu karet a měny.`],
[`Zadejte typickou částku platby a měsíční objem.`,`Upravte seznam zpracovatelů na své skutečné sazby.`,`Porovnejte efektivní sazby a roční náklady.`],
[[`Proč je efektivní sazba u malých plateb vyšší?`,`Pevný poplatek (například 0,30) je velkým podílem platby 5.`],[`Jsou to aktuální ceny?`,`Jsou to ceníkové ceny z roku 2024. Poplatky se mění; použijte sazby z vlastní smlouvy.`]]],
'effective-hourly-rate-calculator': [[
`Plat 60 000 při 40 hodinách zní jako 28,85 za hodinu, ale hodin, které práce skutečně zabere, je víc. Zadejte čas dojíždění, neplacené přesčasy, volné týdny a náklady spojené s prací a uvidíte, kolik vyděláváte za každou hodinu, kterou skutečně věnujete.`,
`Nominální sazba = plat ÷ (smluvní hodiny × odpracované týdny). Efektivní sazba = (plat − náklady spojené s prací) ÷ (smluvní hodiny + neplacené přesčasy + hodiny dojíždění) ročně, přičemž dojíždění se počítá jako dvě cesty za pracovní den na pracoviště. Odpracované týdny jsou 52 minus volné týdny. Výsledek slouží k porovnání pracovních nabídek a práce z domova s prací v kanceláři, ne k výpočtu daní.`],
[`Zadejte plat, smluvní hodiny a volné týdny.`,`Přidejte dojíždění, neplacené hodiny a roční náklady na práci.`,`Porovnejte efektivní a nominální hodinovou sazbu.`],
[[`Má se dojíždění počítat jako pracovní doba?`,`Právně ne, ale je to čas, který vám práce bere ze života, takže při porovnání nabídek záleží.`],[`Je to před zdaněním nebo po?`,`Používejte hrubé nebo čisté důsledně; kalkulačka daně nepoužívá.`]]],
'salary-to-contractor-rate-calculator': [[
`Freelanceři, kteří plat prostě dělí 2080 hodinami, si účtují o třetinu méně. Tato kalkulačka přidává to, co za vás platí zaměstnavatel (benefity, penze, pojištění), vaše vlastní náklady na podnikání, neplacené volné týdny a nefakturovatelný čas na administrativu a hledání klientů.`,
`Sazba = (plat × (1 + benefity %) + vlastní náklady) ÷ fakturovatelné hodiny ÷ (1 − daňová rezerva). Fakturovatelné hodiny = (52 − volné týdny) × hodiny týdně × fakturovatelný podíl. Podíl 70 % je pro mnoho freelancerů realistický. Daňová rezerva umožňuje sazbu navýšit na daně nebo riziko. Denní sazba předpokládá 8 fakturovatelných hodin.`],
[`Zadejte plat, který chcete dorovnat, a procento benefitů.`,`Přidejte své náklady, volné týdny a fakturovatelný podíl.`,`Použijte hodinovou a denní sazbu jako spodní hranici cen.`],
[[`Proč nemohu plat prostě vydělit 2080?`,`Protože nemůžete fakturovat každou hodinu: administrativa, obchod a dovolená jsou neplacené a pojištění i vybavení si platíte sami.`],[`Jaký fakturovatelný podíl je realistický?`,`60–80 % u konzultantů, méně při budování klientské báze.`]]],
};
