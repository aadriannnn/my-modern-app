import csv
from io import StringIO
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
import psycopg2
import psycopg2.extras
from ..logic.search_logic import get_db_connection, find_canonical_key, CANONICAL_MAP_MATERII, extract_base_obiect, CANONICAL_MAP_OBIECTE, refresh_menu_cache

router = APIRouter()

@router.post("/filters/refresh")
def refresh_filters():
    try:
        refresh_menu_cache()
        return {"message": "Cache-ul filtrelor a fost actualizat cu succes."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A apărut o eroare la actualizarea cache-ului: {e}")

@router.get("/equivalents/export", response_class=Response)
def export_equivalents():
    try:
        sql = "SELECT DISTINCT NULLIF(TRIM(COALESCE(b.data->>'materie', b.data->>'materia', b.data->>'materie_principala')), '') as materie_orig, NULLIF(TRIM(b.data->>'obiect'), '') as obiect_orig FROM blocuri b"
        map_materii_orig = {}
        map_obiecte_orig = {}

        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        for materie_orig, obiect_orig in rows:
            if materie_orig not in map_materii_orig:
                map_materii_orig[materie_orig] = find_canonical_key(materie_orig, CANONICAL_MAP_MATERII)
            if obiect_orig not in map_obiecte_orig:
                key = find_canonical_key(obiect_orig, CANONICAL_MAP_OBIECTE)
                map_obiecte_orig[obiect_orig] = key if key else extract_base_obiect(obiect_orig)

        materii_canonice = set(m for m in map_materii_orig.values() if m)
        obiecte_canonice = set(o for o in map_obiecte_orig.values() if o)

        existing_prefs = {}
        with get_db_connection() as conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT type, term_canonic_original, term_preferat FROM filtre_echivalente")
            for row in cur:
                existing_prefs[(row['type'], row['term_canonic_original'])] = row['term_preferat']

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

@router.post("/equivalents/import")
async def import_equivalents(file: UploadFile = File(...)):
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
            to_insert.append((type_val, term_orig, term_pref or term_orig))

        if not to_insert:
            raise HTTPException(status_code=400, detail="Fișierul CSV este gol sau invalid.")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM filtre_echivalente")
                sql_insert = "INSERT INTO filtre_echivalente (type, term_canonic_original, term_preferat) VALUES (%s, %s, %s)"
                psycopg2.extras.execute_batch(cur, sql_insert, to_insert)
            conn.commit()

        return {"message": f"S-au importat {len(to_insert)} echivalențe."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A apărut o eroare la import: {e}")

@router.get("/equivalents/help", response_model=dict)
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
    7. **CRITIC: Apăsați 'Actualizează filtre'** pentru a re-genera meniul cu noile denumiri.
    """
    return {"title": "Cum se modifică Echivalențele", "message": help_text}
