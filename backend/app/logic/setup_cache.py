from sqlmodel import Session, text


def setup_filtre_cache(session: Session):
    """
    Creează tabelele de cache:
    1. filtre_cache: Pentru filtre simple (tip_speta, parte)
    2. filtre_cache_menu: PENTRU A STOCA MENIUL PRE-CALCULAT (JSON)
    3. filtre_echivalente: PENTRU A STOCA MAPĂRILE UTILIZATORULUI
    """
    sql = """
    DROP TABLE IF EXISTS filtre_cache_menu;
    -- Tabela pentru filtre simple (tip_speta, parte)
    CREATE TABLE IF NOT EXISTS filtre_cache (
        tip TEXT NOT NULL,
        valoare TEXT NOT NULL,
        PRIMARY KEY (tip, valoare)
    );
    CREATE INDEX IF NOT EXISTS idx_filtre_cache_tip ON filtre_cache(tip);

    -- Tabela pentru a stoca meniul pre-calculat
    CREATE TABLE IF NOT EXISTS filtre_cache_menu (
        id INT PRIMARY KEY,
        menu_data JSONB,
        materii_map JSONB,
        obiecte_map JSONB,
        last_updated TIMESTAMPTZ DEFAULT NOW()
    );

    -- NOU: Tabela pentru echivalențe definite de utilizator
    CREATE TABLE IF NOT EXISTS filtre_echivalente (
        type TEXT NOT NULL, -- 'materie' or 'obiect'
        term_canonic_original TEXT NOT NULL, -- Termenul generat de cod (ex: 'furt')
        term_preferat TEXT NOT NULL, -- Termenul preferat de user (ex: 'Furturi')
        PRIMARY KEY (type, term_canonic_original)
    );

    -- Funcția de refresh DOAR pentru filtrele simple
    CREATE OR REPLACE FUNCTION refresh_filtre_cache_simple()
    RETURNS void AS $$
    BEGIN
        DELETE FROM filtre_cache;

        INSERT INTO filtre_cache (tip, valoare)
        SELECT DISTINCT 'tip_speta',
        NULLIF(TRIM(COALESCE(b.obj->>'tip_speta', b.obj->>'tip', b.obj->>'categorie_speta')), '')
        FROM blocuri b WHERE NULLIF(TRIM(COALESCE(b.obj->>'tip_speta', b.obj->>'tip', b.obj->>'categorie_speta')), '') IS NOT NULL;

        INSERT INTO filtre_cache (tip, valoare)
        SELECT DISTINCT 'parte',
        NULLIF(TRIM(COALESCE(b.obj->>'parte', b.obj->>'nume_parte')), '')
        FROM blocuri b WHERE NULLIF(TRIM(COALESCE(b.obj->>'parte', b.obj->>'nume_parte')), '') IS NOT NULL;
    END;
    $$ LANGUAGE plpgsql;
    """
    session.exec(text(sql))
    session.commit()


def refresh_filtre_cache_simple(session: Session):
    """Rulează funcția SQL pentru a reîmprospăta 'tip_speta' și 'parte'."""
    session.exec(text("SELECT refresh_filtre_cache_simple();"))
    session.commit()
