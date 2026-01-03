import csv
from io import StringIO
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import Response
from sqlmodel import Session, text
from ..db import get_session
from ..logic.normalization import find_canonical_key, extract_base_obiect
from ..logic.filters import CANONICAL_MAP_MATERII, CANONICAL_MAP_OBIECTE
from ..models import FiltreEchivalente

router = APIRouter(prefix="/equivalents", tags=["equivalents"])

@router.get("/export", response_class=Response)
def export_equivalents(session: Session = Depends(get_session)):
    try:
        # Step 1: Extract unique raw materie and obiect terms from the database
        query_terms = text("SELECT DISTINCT obj->>'materie' as materie_orig, obj->>'obiect' as obiect_orig FROM blocuri")
        rows = session.execute(query_terms).mappings().all()

        map_materii_orig = {}
        map_obiecte_orig = {}

        for row in rows:
            materie_orig, obiect_orig = row['materie_orig'], row['obiect_orig']
            if materie_orig and materie_orig not in map_materii_orig:
                map_materii_orig[materie_orig] = find_canonical_key(materie_orig, CANONICAL_MAP_MATERII)
            if obiect_orig and obiect_orig not in map_obiecte_orig:
                key = find_canonical_key(obiect_orig, CANONICAL_MAP_OBIECTE)
                map_obiecte_orig[obiect_orig] = key if key else extract_base_obiect(obiect_orig)

        materii_canonice = set(m for m in map_materii_orig.values() if m)
        obiecte_canonice = set(o for o in map_obiecte_orig.values() if o)

        # Step 2: Get existing preferences from the equivalents table
        existing_prefs = {}
        eq_rows = session.query(FiltreEchivalente).all()
        for row in eq_rows:
            existing_prefs[(row.type, row.term_canonic_original)] = row.term_preferat

        # Step 3: Generate the CSV content
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['type', 'term_canonic_original', 'term_preferat'])

        for m in sorted(materii_canonice):
            pref = existing_prefs.get(('materie', m), m)
            writer.writerow(['materie', m, pref])

        for o in sorted(obiecte_canonice):
            pref = existing_prefs.get(('obiect', o), o)
            writer.writerow(['obiect', o, pref])

        output.seek(0)
        return Response(content=output.read(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=equivalents.csv"})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A apărut o eroare la export: {e}")

@router.post("/import")
async def import_equivalents(session: Session = Depends(get_session), file: UploadFile = File(...)):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Tip de fișier invalid. Vă rugăm să încărcați un fișier CSV.")

    try:
        contents = await file.read()
        decoded_contents = contents.decode('utf-8-sig')
        csv_reader = csv.reader(StringIO(decoded_contents))

        header = next(csv_reader)
        if header != ['type', 'term_canonic_original', 'term_preferat']:
            raise HTTPException(status_code=400, detail="Antet CSV invalid.")

        to_insert = []
        for row in csv_reader:
            if not row or len(row) < 3: continue
            type_val, term_orig, term_pref = row[0].strip(), row[1].strip(), row[2].strip()
            if not type_val or not term_orig: continue
            to_insert.append(FiltreEchivalente(type=type_val, term_canonic_original=term_orig, term_preferat=term_pref or term_orig))

        if not to_insert:
            raise HTTPException(status_code=400, detail="Fișierul CSV este gol sau invalid.")

        # Delete old entries and add new ones
        session.execute(text("DELETE FROM filtre_echivalente"))
        session.add_all(to_insert)
        session.commit()

        return {"message": f"S-au importat {len(to_insert)} echivalențe. Vă rugăm să reîncărcați filtrele."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A apărut o eroare la import: {e}")

@router.get("/help", response_model=dict)
def get_equivalents_help():
    help_text = """
    1. Apăsați 'Export Echivalențe' pentru a genera un fișier .csv.
    2. Deschideți fișierul în Excel sau alt editor CSV.
    3. Fișierul are 3 coloane:
       - type (tipul: 'materie' sau 'obiect')
       - term_canonic_original (termenul din cod)
       - term_preferat (termenul afișat în meniu)
    4. **Modificați DOAR valorile din coloana 'term_preferat'**.
       NU modificați coloanele 'type' sau 'term_canonic_original'.
    --- EXEMPLE ---
    A) PENTRU A GRUPA (Sinonime):
       Vreți ca 'furt' și 'furt calificat' să apară ambele ca 'Furturi'.
       type,term_canonic_original,term_preferat
       obiect,furt,Furturi
       obiect,furt calificat,Furturi
    B) PENTRU A REDENUMI:
       Vreți ca materia 'Penal' să se numească 'Drept Penal'.
       type,term_canonic_original,term_preferat
       materie,Penal,Drept Penal
    -------------------------
    5. Salvați fișierul .csv.
    6. Apăsați 'Import Echivalențe' și selectați fișierul salvat.
    7. **CRITIC: Apăsați 'Actualizează filtre'** (din meniul principal) pentru a re-genera meniul cu noile denumiri.
    """
    return {"title": "Cum se modifică Echivalențele", "message": help_text}
