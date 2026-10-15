namespace Distribo.Api.Data.Seed;

/// <summary>
/// Katalog testimi (kategori → nënkategori → produkte). Emrat dhe çmimet janë shembuj,
/// jo të dhëna reale; në prodhim katalogu vjen nga programi i distribucionit.
/// </summary>
internal static class SeedCatalog
{
    internal record P(string Name, string Unit, string? Packaging, decimal PackSize, decimal MinQty, decimal Price, decimal Stock, string? Description = null);

    internal record Sub(string Name, P[] Products);

    internal record Root(string Name, string Icon, string Color, Sub[] Subs);

    internal static readonly Root[] Data =
    [
        new("Alkoolike", "wine", "#8E2430",
        [
            new("Whisky",
            [
                new("Whisky Skocez 12 vjeç 0.7L", "copë", "Kuti 6 copë", 1, 1, 3000, 60, "Whisky skocez i përzier, i vjetëruar 12 vjet."),
                new("Whisky Skocez 12 vjeç 1L", "copë", "Kuti 6 copë", 1, 1, 3200, 48),
                new("Whisky Irlandez 0.7L", "copë", "Kuti 6 copë", 1, 1, 2600, 72),
                new("Whisky Amerikan Bourbon 0.7L", "copë", "Kuti 6 copë", 1, 1, 2900, 54),
                new("Whisky Single Malt 18 vjeç 0.7L", "copë", null, 1, 1, 7000, 12),
            ]),
            new("Vodka",
            [
                new("Vodka Klasike 0.7L", "copë", "Kuti 12 copë", 1, 1, 1400, 120),
                new("Vodka Klasike 1L", "copë", "Kuti 12 copë", 1, 1, 1800, 96),
                new("Vodka Premium 0.7L", "copë", "Kuti 6 copë", 1, 1, 2500, 40),
            ]),
            new("Gin",
            [
                new("Gin London Dry 0.7L", "copë", "Kuti 6 copë", 1, 1, 2200, 60),
                new("Gin Premium 0.7L", "copë", "Kuti 6 copë", 1, 1, 3800, 24),
            ]),
            new("Rum",
            [
                new("Rum i Bardhë 0.7L", "copë", "Kuti 6 copë", 1, 1, 1700, 48),
                new("Rum i Errët 0.7L", "copë", "Kuti 6 copë", 1, 1, 2100, 36),
            ]),
            new("Konjak & Liker",
            [
                new("Konjak Skënderbeu 0.7L", "copë", "Kuti 6 copë", 1, 1, 1500, 90, "Konjak shqiptar."),
                new("Liker Bajame 0.7L", "copë", "Kuti 6 copë", 1, 1, 1900, 30),
                new("Liker Barishtesh 0.7L", "copë", "Kuti 6 copë", 1, 1, 2300, 42),
                new("Raki Rrushi 0.7L", "copë", "Kuti 6 copë", 1, 1, 900, 150),
            ]),
        ]),
        new("Birra", "beer", "#C77D0A",
        [
            new("Birra vendi",
            [
                new("Birra Lager 0.33L kanoçe", "copë", "Pako 24 copë", 24, 24, 90, 2400),
                new("Birra Lager 0.5L shishe", "copë", "Arkë 20 copë", 20, 20, 110, 1600),
                new("Birra e Zezë 0.5L", "copë", "Arkë 20 copë", 20, 20, 130, 400),
            ]),
            new("Birra të huaja",
            [
                new("Birra Pilsner 0.33L shishe", "copë", "Arkë 24 copë", 24, 24, 150, 1200),
                new("Birra Weiss 0.5L", "copë", "Arkë 20 copë", 20, 20, 210, 480),
                new("Birra pa alkool 0.33L", "copë", "Pako 24 copë", 24, 24, 120, 720),
            ]),
        ]),
        new("Freskuese", "water", "#1565C0",
        [
            new("Pije me gaz",
            [
                new("Kola 0.33L kanoçe", "copë", "Pako 24 copë", 24, 24, 80, 3600),
                new("Kola 1.5L", "copë", "Pako 6 copë", 6, 6, 170, 1200),
                new("Portokall me gaz 0.33L", "copë", "Pako 24 copë", 24, 24, 80, 2400),
                new("Limon me gaz 0.33L", "copë", "Pako 24 copë", 24, 24, 80, 0),
            ]),
            new("Lëngje frutash",
            [
                new("Lëng portokalli 1L", "copë", "Arkë 12 copë", 12, 12, 190, 600, "Lëng frutash 100% portokall, pa sheqer të shtuar."),
                new("Lëng molle 1L", "copë", "Arkë 12 copë", 12, 12, 180, 480),
                new("Lëng pjeshke 0.25L", "copë", "Arkë 24 copë", 24, 24, 70, 960),
            ]),
            new("Ujë",
            [
                new("Ujë natyral 0.5L", "copë", "Pako 12 copë", 12, 12, 35, 4800, "Ujë natyral pa gaz, shishe plastike 0.5 litra."),
                new("Ujë natyral 1.5L", "copë", "Pako 6 copë", 6, 6, 60, 3000),
                new("Ujë mineral me gaz 0.25L qelq", "copë", "Arkë 24 copë", 24, 24, 60, 1200),
            ]),
            new("Energjike",
            [
                new("Pije energjike 0.25L", "copë", "Pako 24 copë", 24, 24, 150, 1440),
                new("Pije energjike pa sheqer 0.25L", "copë", "Pako 24 copë", 24, 24, 160, 480),
            ]),
        ]),
        new("Tonik & Baza Cocktail", "flask", "#00897B",
        [
            new("Tonik",
            [
                new("Tonik 0.2L qelq", "copë", "Arkë 24 copë", 24, 24, 110, 960),
                new("Tonik Premium 0.2L", "copë", "Arkë 24 copë", 24, 24, 160, 480),
                new("Ginger Ale 0.2L", "copë", "Arkë 24 copë", 24, 24, 130, 360),
            ]),
            new("Shurupe & Baza",
            [
                new("Shurup Grenadine 0.7L", "copë", "Kuti 6 copë", 1, 1, 900, 60),
                new("Lëng Lime 0.7L", "copë", "Kuti 6 copë", 1, 1, 750, 48),
                new("Shurup Kokosi 0.7L", "copë", "Kuti 6 copë", 1, 1, 950, 30),
            ]),
        ]),
        new("Verë", "wine", "#6A1B4D",
        [
            new("Verë e kuqe",
            [
                new("Verë e kuqe Kallmet 0.75L", "copë", "Arkë 6 copë", 6, 6, 1100, 180, "Verë e kuqe shqiptare nga rrushi Kallmet."),
                new("Verë e kuqe Merlot 0.75L", "copë", "Arkë 6 copë", 6, 6, 1300, 120),
            ]),
            new("Verë e bardhë",
            [
                new("Verë e bardhë Shesh i Bardhë 0.75L", "copë", "Arkë 6 copë", 6, 6, 1000, 150),
                new("Verë e bardhë Chardonnay 0.75L", "copë", "Arkë 6 copë", 6, 6, 1400, 90),
            ]),
            new("Verë rozë",
            [
                new("Verë rozë 0.75L", "copë", "Arkë 6 copë", 6, 6, 1200, 72),
            ]),
        ]),
        new("Shampanjë & Prosecco", "sparkles", "#B8860B",
        [
            new("Prosecco",
            [
                new("Prosecco Extra Dry 0.75L", "copë", "Arkë 6 copë", 6, 6, 1600, 120),
                new("Prosecco Brut 0.75L", "copë", "Arkë 6 copë", 6, 6, 1800, 60),
            ]),
            new("Shampanjë",
            [
                new("Shampanjë Brut 0.75L", "copë", null, 1, 1, 6500, 18),
                new("Verë e gazuar Spumante 0.75L", "copë", "Arkë 6 copë", 6, 6, 900, 90),
            ]),
        ]),
        new("Kafe & Të Nxehta", "cafe", "#5D4037",
        [
            new("Kafe",
            [
                new("Kafe espresso kokërr 1kg", "pako", null, 1, 1, 2400, 120, "Përzierje arabica/robusta, e përshtatshme për bar."),
                new("Kafe e bluar 250g", "pako", "Kuti 12 pako", 12, 12, 650, 240),
                new("Kapsula espresso 10 copë", "pako", "Kuti 10 pako", 10, 10, 450, 300),
            ]),
            new("Çaj & Çokollatë",
            [
                new("Çaj mali 20 qeska", "pako", "Kuti 12 pako", 12, 12, 220, 360),
                new("Çokollatë e nxehtë 1kg", "pako", null, 1, 1, 1500, 40),
                new("Sheqer me shkop 1kg", "pako", "Thes 10 pako", 10, 10, 260, 200),
            ]),
        ]),
        new("Snacks & Ëmbëlsira", "fast-food", "#E65100",
        [
            new("Snacks",
            [
                new("Patatina 150g", "pako", "Arkë 18 pako", 18, 18, 180, 900),
                new("Kikirikë të kripur 200g", "pako", "Kuti 20 pako", 20, 20, 200, 600),
                new("Fëstëkë 150g", "pako", "Kuti 20 pako", 20, 20, 450, 200),
            ]),
            new("Ëmbëlsira",
            [
                new("Biskota me çokollatë 200g", "pako", "Arkë 24 pako", 24, 24, 140, 960),
                new("Çokollatë qumështi 100g", "copë", "Kuti 20 copë", 20, 20, 120, 1200),
                new("Kroasan me krem 60g", "copë", "Kuti 24 copë", 24, 24, 50, 1440),
            ]),
        ]),
        new("Aksesorë Bari & Pastrim", "sparkles-outline", "#455A64",
        [
            new("Aksesorë bari",
            [
                new("Gota plastike 0.2L (100 copë)", "pako", "Kuti 20 pako", 20, 20, 250, 400),
                new("Kallamë pirje (500 copë)", "pako", "Kuti 10 pako", 10, 10, 350, 200),
                new("Peceta letre 100 copë", "pako", "Arkë 24 pako", 24, 24, 90, 960),
            ]),
            new("Pastrim",
            [
                new("Detergjent enësh 1L", "copë", "Arkë 12 copë", 12, 12, 210, 600),
                new("Zbardhues 2L", "copë", "Arkë 6 copë", 6, 6, 180, 420),
                new("Pastrues xhamash 0.75L", "copë", "Arkë 12 copë", 12, 12, 230, 360),
                new("Qese mbeturinash 30 copë", "pako", "Kuti 20 pako", 20, 20, 150, 800),
            ]),
        ]),
    ];

    /// <summary>
    /// Foto provizore (SeedImages/&lt;çelësi&gt;.jpg, licenca te SeedImages/ATTRIBUTIONS.md) sipas fjalëve në emër.
    /// Rendi ka rëndësi: rregulli i parë që përputhet fiton. Pa përputhje mbetet vizatimi SVG.
    /// </summary>
    internal static readonly (string Contains, string Image)[] ImageRules =
    [
        ("Whisky", "whisky"), ("Vodka", "vodka"), ("Gin ", "gin"), ("Rum", "rum"), ("Konjak", "cognac"),
        ("Liker", "liqueur"), ("Raki", "raki"),
        ("Birra e Zezë", "dark_beer"), ("Birra Weiss", "wheat_beer"), ("Birra Lager 0.33L", "beer_can"), ("Birra", "beer_bottle"),
        ("Kola 0.33L", "cola_can"), ("Kola", "cola"), ("Portokall me gaz", "orange_soda"), ("Limon me gaz", "lemon_soda"),
        ("Lëng portokalli", "orange_juice"), ("Lëng molle", "apple_juice"), ("Lëng pjeshke", "peach_juice"),
        ("Ujë mineral", "sparkling_water"), ("Ujë", "water"), ("energjike", "energy"),
        ("Ginger Ale", "ginger_ale"), ("Tonik", "tonic"), ("Shurup", "syrup"), ("Lime", "lime"),
        ("Verë e kuqe", "red_wine"), ("Verë e bardhë", "white_wine"), ("Verë rozë", "rose_wine"),
        ("Prosecco", "prosecco"), ("Shampanjë", "champagne"), ("Spumante", "champagne"),
        ("Kafe espresso kokërr", "coffee_beans"), ("Kafe e bluar", "ground_coffee"), ("Kapsula", "capsules"),
        ("Çaj", "tea"), ("Çokollatë e nxehtë", "hot_chocolate"),
        ("Patatina", "chips"), ("Kikirikë", "nuts"), ("Fëstëkë", "nuts"), ("Biskota", "cookies"),
        ("Çokollatë qumështi", "chocolate"), ("Kroasan", "croissant"),
        ("Gota plastike", "cups"), ("Kallamë", "straws"), ("Detergjent enësh", "dish_soap"), ("Zbardhues", "bleach"),
        ("Pastrues xhamash", "glass_cleaner"), ("Qese mbeturinash", "trash_bags"),
    ];

    internal static string? ImageFor(string productName) =>
        ImageRules.FirstOrDefault(r => productName.Contains(r.Contains, StringComparison.OrdinalIgnoreCase)).Image;

    /// <summary>Produktet me ofertë aktive në të dhënat e testimit.</summary>
    internal static readonly string[] PromoProducts =
    [
        "Whisky Skocez 12 vjeç 1L", "Birra Lager 0.33L kanoçe", "Kola 1.5L", "Prosecco Extra Dry 0.75L",
        "Verë e kuqe Kallmet 0.75L", "Patatina 150g", "Tonik 0.2L qelq",
    ];

    /// <summary>Produktet me çmim të veçantë për klientin demo (demonstrojnë çmimet sipas klientit).</summary>
    internal static readonly string[] DemoCustomerPrices = ["Ujë natyral 0.5L", "Vodka Klasike 0.7L", "Birra Lager 0.5L shishe"];
}
