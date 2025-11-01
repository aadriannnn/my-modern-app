from sqlmodel import Session, text


def setup_filtre_cache(session: Session):
    """
    Creează tabelele de cache cu suport DUAL-MODE pentru PostgreSQL și SQLite.
    """
    is_postgres = session.bind.dialect.name == "postgresql"

    # Tipuri de date SQL condiționate
    json_type = "JSONB" if is_postgres else "JSON"
    timestamp_type = "TIMESTAMPTZ" if is_postgres else "DATETIME"
    now_function = "NOW()" if is_postgres else "CURRENT_TIMESTAMP"

    # Schema definition statements
    statements = [
        "DROP TABLE IF EXISTS filtre_cache_menu;",
        """
        CREATE TABLE IF NOT EXISTS filtre_cache (
            tip TEXT NOT NULL,
            valoare TEXT NOT NULL,
            PRIMARY KEY (tip, valoare)
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_filtre_cache_tip ON filtre_cache(tip);",
        f"""
        CREATE TABLE IF NOT EXISTS filtre_cache_menu (
            id INT PRIMARY KEY,
            menu_data {json_type},
            materii_map {json_type},
            obiecte_map {json_type},
            last_updated {timestamp_type} DEFAULT {now_function}
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS filtre_echivalente (
            type TEXT NOT NULL,
            term_canonic_original TEXT NOT NULL,
            term_preferat TEXT NOT NULL,
            PRIMARY KEY (type, term_canonic_original)
        );
        """
    ]

    # PostgreSQL-specific function
    if is_postgres:
        statements.append("""
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
        """)

    for sql in statements:
        session.exec(text(sql))

    session.commit()


def refresh_filtre_cache_simple(session: Session):
    """Rulează funcția SQL pentru a reîmprospăta 'tip_speta' și 'parte'."""
    session.exec(text("SELECT refresh_filtre_cache_simple();"))
    session.commit()
