import psycopg2
import psycopg2.extras
import requests
from sqlmodel import Session

from ..config import get_settings
from ..models import FiltreCacheMenu
from .filters import refresh_and_reload
from .normalization import normalize_text
from ..cache import get_cached_filters

settings = get_settings()

def _overlap(a, b):
    if not a or not b: return 0.0
    A, B = set(normalize_text(a).split()), set(normalize_text(b).split())
    if not A: return 0.0
    return len(A & B) / len(A)

def get_db_connection():
    return psycopg2.connect(settings.DATABASE_URL)

def embed_text(text: str) -> list[float]:
    try:
        r = requests.post(
            f"{settings.OLLAMA_URL}/api/embeddings",
            json={"model": settings.MODEL_NAME, "prompt": text},
            timeout=60
        )
        r.raise_for_status()
        emb = r.json().get("embedding")
        if not emb:
            raise RuntimeError("Embedding gol returnat de Ollama.")
        if len(emb) != settings.VECTOR_DIM:
            raise RuntimeError(
                f"Eroare dimensiune embedding! Așteptam {settings.VECTOR_DIM}, dar modelul '{settings.MODEL_NAME}' a returnat {len(emb)}.\n"
                f"Verificați dacă modelul este corect configurat în Ollama."
            )
        return emb
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Eroare la contactarea Ollama: {e}")

def vector_to_literal(vec: list[float]) -> str:
    return "[" + ",".join(map(str, vec)) + "]"

# ===================== LOGIC FUNCTIONS =====================

def search_similar(user_text: str, embedding: list[float], filters: dict):
    emb = vector_to_literal(embedding)
    materii_canon = filters.get("materie") or []
    obiecte_canon = filters.get("obiect") or []
    tipuri_orig = filters.get("tip_speta") or []
    parti_selectate = filters.get("parte") or []

    cached_filters = get_cached_filters()
    materii_map = cached_filters.get("materii_map", {})
    obiecte_map = cached_filters.get("obiecte_map", {})

    materii_orig = []
    if materii_map:
        for m_canon in materii_canon:
            materii_orig.extend(materii_map.get(m_canon, [m_canon]))
    else:
        materii_orig = materii_canon

    obiecte_orig = []
    if obiecte_map:
        for o_canon in obiecte_canon:
            obiecte_orig.extend(obiecte_map.get(o_canon, [o_canon]))
    else:
        obiecte_orig = obiecte_canon

    where_clauses = []
    params = []

    # Helper function to build ILIKE conditions
    def build_ilike(field, values):
        conditions = " OR ".join([f"NULLIF(TRIM(b.obj->>'{field}'),'') ILIKE %s" for _ in values])
        return f"({conditions})"

    if materii_orig:
        # Special handling for materie to check canonical AND original values
        materii_to_check = set(materii_canon) | set(materii_orig)
        like_conditions = " OR ".join(["NULLIF(TRIM(b.obj->>'materie'),'') ILIKE %s" for _ in materii_to_check])
        where_clauses.append(f"({like_conditions})")
        params.extend([f"%{m}%" for m in materii_to_check])

    if obiecte_orig:
         # Special handling for obiect to check canonical AND original values
        obiecte_to_check = set(obiecte_canon) | set(obiecte_orig)
        like_conditions = " OR ".join(["NULLIF(TRIM(b.obj->>'obiect'),'') ILIKE %s" for _ in obiecte_to_check])
        where_clauses.append(f"({like_conditions})")
        params.extend([f"%{o}%" for o in obiecte_to_check])

    if tipuri_orig:
        where_clauses.append(build_ilike('tip_speta', tipuri_orig))
        params.extend([f"%{t}%" for t in tipuri_orig])

    if parti_selectate:
        where_clauses.append(build_ilike('parte', parti_selectate))
        params.extend([f"%{p}%" for p in parti_selectate])

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    sql = f"""
    SELECT
        v.speta_id,
        b.obj,
        (v.embedding <=> %s::vector) AS semantic_distance
    FROM vectori v
    JOIN blocuri b ON b.id = v.speta_id
    {where_sql}
    ORDER BY semantic_distance ASC
    LIMIT %s;
    """

    params.insert(0, emb)
    params.append(settings.TOP_K)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()

    results_processed = []
    for row in rows:
        semantic_sim = 1.0 - (float(row['semantic_distance']) if row['semantic_distance'] is not None else 1.0)
        obj = row['obj']
        tip_speta = obj.get('tip_speta', "—")
        materie = obj.get('materie', "—")

        # Updated logic to find the best text content
        situatia_de_fapt_text = obj.get('text_situatia_de_fapt') or obj.get('situatia_de_fapt') or ""
        solutia_text = obj.get('solutia') or ""
        text_content_for_den = situatia_de_fapt_text if situatia_de_fapt_text else solutia_text

        denumire_orig = obj.get('denumire')

        den_finala = (text_content_for_den.strip().replace("\n", " ").replace("\r", " ")
                      if text_content_for_den else
                      obj.get("titlu") or denumire_orig or f"{tip_speta} - {materie} (ID {row['speta_id']})")

        results_processed.append({
            "id": row['speta_id'],
            "denumire": den_finala,
            "situatia_de_fapt_full": situatia_de_fapt_text,
            "argumente_instanta": obj.get('argumente_instanta') or "",
            "text_individualizare": obj.get('text_individualizare') or "",
            "rezumat_generat_ai": obj.get('rezumat_generat_ai') or "",
            "tip_speta": tip_speta,
            "materie": materie,
            "score": semantic_sim,
            "match_count": 0,
            "data": obj,
            "tip_instanta": obj.get('tip_instanta') or "—",
            "data_solutiei": obj.get('data_solutiei') or "—",
            "numar_dosar": obj.get('numar_dosar') or "—"
        })

    BETA = 0.15
    if user_text:
        for r in results_processed:
            text_boost = _overlap(user_text, r["situatia_de_fapt_full"])
            r["score"] = (1 - BETA) * r["score"] + BETA * text_boost

    results_processed.sort(key=lambda x: x["score"], reverse=True)
    return results_processed
