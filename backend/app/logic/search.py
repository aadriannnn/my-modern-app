
from sqlmodel import Session, text
from ..logic.normalization import _overlap
from ..config import get_settings

settings = get_settings()
ALPHA_SCORE = settings.ALPHA_SCORE
TOP_K = settings.TOP_K


def vector_to_literal(vec):
    return "[" + ",".join(str(x) for x in vec) + "]"


async def search_similar(
    db: Session, user_text: str, embedding: list[float], filters: dict
):
    emb = vector_to_literal(embedding)

    materii_canon = filters.get("materie") or []
    obiecte_canon = filters.get("obiect") or []
    tipuri_orig = filters.get("tip_speta") or []
    parti_selectate = filters.get("parte") or []

    materii_orig = []
    # This part will be adapted later, once the filter logic is in place
    # if self.materii_canon_to_orig:
    # for m_canon in materii_canon:
    # materii_orig.extend(self.materii_canon_to_orig.get(m_canon, []))
    # else:
    # print("Avertisment: Maparea materiilor canonice lipsește.")
    materii_orig = materii_canon

    obiecte_orig = []
    # This part will be adapted later, once the filter logic is in place
    # if self.obiecte_canon_to_orig:
    # for o_canon in obiecte_canon:
    # obiecte_orig.extend(self.obiecte_canon_to_orig.get(o_canon, []))
    # else:
    # print("Avertisment: Maparea obiectelor canonice lipsește.")
    obiecte_orig = obiecte_canon

    # --- Construim clauza LIKE pentru 'parte' ---
    parte_match_sql = "0"  # Valoare default (0 puncte)
    parti_like_params = {}  # Lista de parametri

    if parti_selectate:
        like_conditions_sql = " OR ".join(
            [f"f.parte ILIKE :parte{i}" for i in range(len(parti_selectate))]
        )
        for i, p in enumerate(parti_selectate):
            parti_like_params[f"parte{i}"] = f"%{p}%"
        parte_match_sql = f"(CASE WHEN ({like_conditions_sql}) THEN 1 ELSE 0 END)"

    parte_filter_active = 1 if parti_selectate else 0

    sql = f"""
    WITH params AS (
        SELECT
            :materii_orig AS materii_orig,
            :obiecte_orig AS obiecte_orig,
            :tipuri_orig AS tipuri_orig
    ), base AS (
        SELECT v.speta_id, v.embedding, b.obj,
        NULLIF(TRIM(COALESCE(b.obj->>'materie',b.obj->>'materia',b.obj->>'materie_principala')),'') AS materie,
        NULLIF(TRIM(b.obj->>'obiect'),'') AS obiect,
        NULLIF(TRIM(COALESCE(b.obj->>'tip_speta',b.obj->>'tip',b.obj->>'categorie_speta')),'') AS tip_speta,
        NULLIF(TRIM(COALESCE(b.obj->>'parte',b.obj->>'nume_parte')),'') AS parte
        FROM vectori v JOIN blocuri b ON b.id=v.speta_id
    ), matches AS (
        SELECT f.*, p.materii_orig, p.obiecte_orig, p.tipuri_orig,
        (CASE WHEN array_length(p.materii_orig,1)>0 AND f.materie=ANY(p.materii_orig) THEN 1 ELSE 0 END) +
        (CASE WHEN array_length(p.obiecte_orig,1)>0 AND f.obiect=ANY(p.obiecte_orig) THEN 1 ELSE 0 END) +
        (CASE WHEN array_length(p.tipuri_orig,1)>0 AND f.tip_speta=ANY(p.tipuri_orig) THEN 1 ELSE 0 END) +
        ({parte_match_sql})
        AS match_count,
        (CASE WHEN array_length(p.materii_orig,1)>0 THEN 1 ELSE 0 END) +
        (CASE WHEN array_length(p.obiecte_orig,1)>0 THEN 1 ELSE 0 END) +
        (CASE WHEN array_length(p.tipuri_orig,1)>0 THEN 1 ELSE 0 END) +
        ({parte_filter_active})
        AS total_active_filters
        FROM base f CROSS JOIN params p
    )
    SELECT f.speta_id,
    (f.obj->>'denumire') denumire_orig,
    COALESCE(
        NULLIF(TRIM(f.obj->>'text_situatia_de_fapt'), ''),
        NULLIF(TRIM(f.obj->>'situatia_de_fapt'), ''),
        NULLIF(TRIM(f.obj->>'situatie'), ''),
        NULLIF(TRIM(f.obj->>'solutia'), '')
    ) AS situatia_de_fapt_text,
    f.tip_speta,
    f.materie,
    (f.embedding <=> :embedding) semantic_distance,
    f.obj,
    f.match_count,
    f.total_active_filters,
    f.obj->>'tip_instanta' AS tip_instanta,
    f.obj->>'data_solutiei' AS data_solutiei,
    f.obj->>'numar_dosar' AS numar_dosar
    FROM matches f
    ORDER BY (f.embedding <=> :embedding) ASC
    LIMIT :top_k;
    """

    params = {
        "materii_orig": materii_orig,
        "obiecte_orig": obiecte_orig,
        "tipuri_orig": tipuri_orig,
        "embedding": emb,
        "top_k": TOP_K,
        **parti_like_params,
    }

    result = db.exec(text(sql), params)
    rows = result.fetchall()

    results_processed = []
    for r in rows:
        (
            speta_id,
            denumire_orig,
            situatia_de_fapt_text,
            tip_speta,
            materie,
            semantic_distance,
            obj,
            match_count,
            total_active_filters,
            tip_instanta,
            data_solutiei,
            numar_dosar,
        ) = r

        semantic_sim = 1.0 - (
            float(semantic_distance) if semantic_distance is not None else 1.0
        )
        if total_active_filters > 0:
            keyword_score = match_count / total_active_filters
        else:
            keyword_score = 0.0

        if total_active_filters == 0:
            final_score = semantic_sim
        else:
            final_score = (ALPHA_SCORE * semantic_sim) + (
                (1 - ALPHA_SCORE) * keyword_score
            )

        if situatia_de_fapt_text:
            den_finala = (
                situatia_de_fapt_text.strip().replace("\n", " ").replace("\r", " ")
            )
        else:
            den_finala = (
                obj.get("titlu")
                or denumire_orig
                or f"{tip_speta or 'Speță'} - {materie or 'Fără materie'} (ID {speta_id})"
            )

        results_processed.append(
            {
                "id": speta_id,
                "denumire": den_finala,
                "situatia_de_fapt_full": situatia_de_fapt_text or "",
                "tip_speta": tip_speta or "—",
                "materie": materie or "—",
                "score": final_score,
                "match_count": int(match_count),
                "obj": obj,
                "tip_instanta": tip_instanta or "—",
                "data_solutiei": data_solutiei or "—",
                "numar_dosar": numar_dosar or "—",
            }
        )

    BETA = 0.15
    if user_text:
        for r in results_processed:
            text_boost = _overlap(user_text, r["situatia_de_fapt_full"])
            r["score"] = (1 - BETA) * r["score"] + BETA * text_boost

    results_processed.sort(key=lambda x: x["score"], reverse=True)
    return results_processed

# --- NEW ANALYTICS FUNCTION ---
async def analyze_predictive(
    db: Session, user_text: str, embedding: list[float], filters: dict
):
    """
    Performs a deep search (top 1000) to aggregate statistics (win rate, taxes)
    and returns rich details for the top 5 matches.
    """
    emb = vector_to_literal(embedding)

    # Use filters if provided, similar to search_similar
    materii_canon = filters.get("materie") or []
    obiecte_canon = filters.get("obiect") or []

    # We define a larger limit for stats
    STATS_LIMIT = 500

    sql = f"""
    WITH base AS (
        SELECT v.speta_id, v.embedding, b.obj,
        (v.embedding <=> :embedding) as dist
        FROM vectori v JOIN blocuri b ON b.id=v.speta_id
    )
    SELECT
        b.speta_id,
        b.dist,
        b.obj
    FROM base b
    ORDER BY b.dist ASC
    LIMIT :limit_stats;
    """

    # Execute query
    result = db.execute(text(sql), {"embedding": emb, "limit_stats": STATS_LIMIT})
    rows = result.fetchall()

    if not rows:
        return None

    # --- Aggregation Logic in Python ---
    wins = 0
    losses = 0
    total_valid_sol = 0

    # Duration Stats
    total_duration_days = 0
    valid_duration_count = 0

    evidence_counts = {}

    top_5_full = []

    from datetime import datetime
    import re

    # Map RO months to text
    RO_MONTHS = {
        'ian': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mai': 5, 'iun': 6,
        'iul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }

    def parse_ro_date(d_str):
        if not d_str: return None
        d_str = d_str.strip().lower()
        # Format: 20-nov-2014 or 20.11.2014

        # Try numeric formats first
        for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(d_str, fmt)
            except ValueError:
                continue

        # Try text format (dd-mon-yyyy)
        parts = re.split(r'[-.\s]+', d_str)
        if len(parts) == 3:
            day, mon, year = parts
            if mon in RO_MONTHS:
                try:
                    return datetime(int(year), RO_MONTHS[mon], int(day))
                except:
                    pass
        return None

    def get_year_from_dosar(dosar_str):
        if not dosar_str: return None
        # Pattern: X/Y/YYYY
        parts = dosar_str.split('/')
        if parts:
            last = parts[-1].strip()
            # Sometimes it has extra chars, extract 4 digits
            match = re.search(r'(20\d{2})', last)
            if match:
                return int(match.group(1))
        return None

    for i, row in enumerate(rows):
        (speta_id, dist, obj) = row

        # Safe extraction from JSON
        # Handle both variants of keys if possible
        tip_solutie = obj.get('tip_solutie')
        d_data = obj.get('data') # Date of solution
        dosar = obj.get('număr_dosar') or obj.get('numar_dosar') # File number
        probe_raw = obj.get('probele_retinute')

        # 1. Win Rate Stats
        if tip_solutie:
            ts_lower = tip_solutie.lower()
            if "admite" in ts_lower and "respinge" not in ts_lower: # simple heuristic
                wins += 1
                total_valid_sol += 1
            elif "respinge" in ts_lower:
                losses += 1
                total_valid_sol += 1
            elif "admite" in ts_lower: # partial admit
                wins += 1 # count as win for now
                total_valid_sol += 1

        # 2. Duration Stats (Estimated)
        # Logic: Start Date = Jan 1st of Dosar Year
        #        End Date = Parsed 'data'
        if dosar and d_data:
             start_year = get_year_from_dosar(dosar)
             dt_end = parse_ro_date(d_data)

             if start_year and dt_end and dt_end.year >= start_year:
                 dt_start = datetime(start_year, 1, 1)
                 days = (dt_end - dt_start).days
                 if 0 < days < 5000: # Sanity filter
                     total_duration_days += days
                     valid_duration_count += 1

        if probe_raw:
            parts = []
            if isinstance(probe_raw, list):
                parts = probe_raw
            elif isinstance(probe_raw, str):
                parts = re.split(r'[,;]\s*', probe_raw)

            for p in parts:
                if not isinstance(p, str): continue
                p_clean = p.strip().lower()
                if not p_clean or p_clean in ["null", "none"]: continue

                if len(p_clean) > 3 and "solicit" not in p_clean:
                    if "inscris" in p_clean: p_clean = "inscrisuri"
                    elif "martor" in p_clean: p_clean = "martori"
                    elif "expertiz" in p_clean: p_clean = "expertiza"
                    elif "interogatori" in p_clean: p_clean = "interogatoriu"
                    elif "anchet" in p_clean: p_clean = "ancheta sociala"

                    if p_clean not in evidence_counts:
                        evidence_counts[p_clean] = 0
                    evidence_counts[p_clean] += 1

        # 4. Top Cases extraction
        if i < 5:
            item_data = {
                "id": speta_id,
                "data": obj,
                "score": 1 - dist
            }
            top_5_full.append(item_data)

    # Final Aggregation
    win_rate = 0
    if total_valid_sol > 0:
        win_rate = int((wins / total_valid_sol) * 100)

    avg_duration_days = 0
    if valid_duration_count > 0:
        avg_duration_days = int(total_duration_days / valid_duration_count)


    # Top Evidence
    top_evidence = sorted(evidence_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    top_evidence_list = [{"name": k.title(), "count": v} for k, v in top_evidence]

    def remove_none(obj):
        if isinstance(obj, list):
            return [remove_none(x) for x in obj if x is not None]
        elif isinstance(obj, dict):
            return {k: remove_none(v) for k, v in obj.items() if v is not None and v != "null"}
        return obj

    final_result = {
        "stats": {
            "win_rate": win_rate,
            "total_analyzed": len(rows),
            "relevant_sol_count": total_valid_sol,
            "avg_duration_days": avg_duration_days,
            "top_evidence": top_evidence_list
        },
        "top_cases": top_5_full
    }

    return remove_none(final_result)
