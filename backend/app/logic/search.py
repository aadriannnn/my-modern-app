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
        SELECT v.speta_id, v.embedding, b.data,
        NULLIF(TRIM(COALESCE(b.data->>'materie',b.data->>'materia',b.data->>'materie_principala')),'') AS materie,
        NULLIF(TRIM(b.data->>'obiect'),'') AS obiect,
        NULLIF(TRIM(COALESCE(b.data->>'tip_speta',b.data->>'tip',b.data->>'categorie_speta')),'') AS tip_speta,
        NULLIF(TRIM(COALESCE(b.data->>'parte',b.data->>'nume_parte')),'') AS parte
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
    (f.data->>'denumire') denumire_orig,
    COALESCE(
        NULLIF(TRIM(f.data->>'text_situatia_de_fapt'), ''),
        NULLIF(TRIM(f.data->>'situatia_de_fapt'), ''),
        NULLIF(TRIM(f.data->>'situatie'), ''),
        NULLIF(TRIM(f.data->>'solutia'), '')
    ) AS situatia_de_fapt_text,
    f.tip_speta,
    f.materie,
    (f.embedding <=> :embedding) semantic_distance,
    f.data,
    f.match_count,
    f.total_active_filters,
    f.data->>'tip_instanta' AS tip_instanta,
    f.data->>'data_solutiei' AS data_solutiei,
    f.data->>'numar_dosar' AS numar_dosar
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
            data,
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
                data.get("titlu")
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
                "data": data,
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
