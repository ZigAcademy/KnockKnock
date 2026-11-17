"""Rendert titelafbeeldingen in Safiro naar PNG (public/assets/titels/).

Waarom: de Safiro-desktoplicentie staat ontwerpwerk toe, maar geen webfont
en geen verspreiding van het fontbestand. Het spel gebruikt daarom Poppins
voor lopende tekst. Koppen die echt in Safiro moeten, worden hier als
afbeelding gemaakt. Het fontbestand zelf komt nooit in het project.

Gebruik (op je eigen Mac):
    pip install pillow
    python3 tools/render_titels.py "/Users/tim.vos/Documents/Branding for Claude/Safiro Complete Desktop"
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

NAVY, BLUE, ORANGE, WHITE = "#152330", "#1F5AFF", "#FF9000", "#FFFFFF"
SCALE = 2  # retina

TITELS = [
    # (bestandsnaam, tekst, grootte, tekstkleur)
    # Het spel kiest per taal: <naam>.png (NL) of <naam>-en.png (EN). Ontbreekt een PNG,
    # dan staat de kop in Poppins. Het titelscherm gebruikt het Knock Knock!-logo.
    ("overgang-ondertussen", "Ondertussen bij Huis & Haard ...", 56, WHITE),
    ("overgang-ondertussen-en", "Meanwhile at Hearth & Home ...", 56, WHITE),
    ("kop-dit-neem-je-mee", "Dit neem je mee", 48, NAVY),
    ("kop-dit-neem-je-mee-en", "Key takeaway", 48, NAVY),
    ("kop-straat-compleet", "De straat is compleet!", 72, WHITE),
    ("kop-straat-compleet-en", "The street is complete!", 72, WHITE),
    ("kop-achter-de-schermen", "Achter de schermen", 48, NAVY),
    ("kop-achter-de-schermen-en", "Behind the scenes", 48, NAVY),
]


def render(fontdir: str, outdir: str) -> None:
    semibold = os.path.join(fontdir, "Safiro-SemiBold.otf")
    if not os.path.exists(semibold):
        sys.exit(f"Niet gevonden: {semibold}")
    os.makedirs(outdir, exist_ok=True)
    for naam, tekst, size, kleur in TITELS:
        font = ImageFont.truetype(semibold, size * SCALE)
        x0, y0, x1, y1 = font.getbbox(tekst)
        pad = 8 * SCALE
        img = Image.new("RGBA", (x1 - x0 + 2 * pad, y1 - y0 + 2 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((pad - x0, pad - y0), tekst, font=font, fill=kleur)
        pad_out = os.path.join(outdir, f"{naam}.png")
        img.save(pad_out, optimize=True)
        print("gemaakt:", pad_out)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    render(sys.argv[1], os.path.join(os.path.dirname(__file__), "..", "public", "assets", "titels"))
