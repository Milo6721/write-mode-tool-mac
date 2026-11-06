# Write Tools dla macOS

Zaznacz tekst, kliknij prawym → **Usługi** → *Write Tools* (albo skrót ⌘⌥M) i wybierz akcję AI.
Usługi dodawane przy pierwszym uruchomieniu: Write Tools, Przetłumacz, Wyślij w Wiadomościach, Wyślij e-mailem.
Kontakty są czytane z aplikacji Kontakty. Klucz API Anthropic wkleisz przy pierwszym użyciu.

## Instalacja z GitHuba
1. Actions → *Build macOS app* → ostatni przebieg → pobierz artefakt (plik .dmg: arm64 dla Maca z Apple Silicon, x64 dla Intela).
2. Przeciągnij aplikację do Programów. Aplikacja nie jest podpisana, więc przy pierwszym otwarciu: prawy przycisk → Otwórz, albo w Terminalu `xattr -cr "/Applications/Write Tools.app"`.
3. Zezwól na: Dostępność (wklejanie wyniku), Automatyzację i Kontakty.
4. Jeśli usług nie widać: Ustawienia systemowe → Klawiatura → Skróty klawiszowe → Usługi → Tekst, i zaznacz je.
