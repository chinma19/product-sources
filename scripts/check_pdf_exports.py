"""Run after npm test; requires PyMuPDF. Check real rendered PDF artifacts."""
from pathlib import Path
import fitz
root = Path('test-results/pdf')
for name in ('blueprint', 'one-glance', 'full-ui-journey'):
    doc = fitz.open(root / (name + '.pdf'))
    if name == 'one-glance':
        assert len(doc) == 1, 'One-glance must be exactly one page'
    title = 'My One-Glance Blueprint' if name == 'one-glance' else 'My Personal Style Blueprint'
    assert title in doc[0].get_text(), 'Heading glyphs missing from embedded font'
    for index, page in enumerate(doc):
        assert page.get_text().strip(), 'Empty export page'
        assert all(0 <= b[0] <= b[2] <= page.rect.width and 0 <= b[1] <= b[3] <= page.rect.height for b in page.get_text('blocks')), 'Content outside page'
        fonts = page.get_fonts()
        assert fonts and all(doc.extract_font(f[0])[3] for f in fonts), 'Unembedded font'
        page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(root / f'{name}-{index+1}.png')
    print(f'{name}: {len(doc)} pages; embedded fonts, heading glyphs and bounds verified; rendered all pages')
