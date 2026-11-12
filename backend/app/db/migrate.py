"""Lightweight forward-only schema sync.

`Base.metadata.create_all` creates missing tables but never alters existing ones, so
columns added to models after a table was first created are added here with
`ALTER TABLE ... ADD COLUMN`. New columns must be nullable (or have a server default).
"""
import logging

from sqlalchemy import inspect
from sqlalchemy.engine import Connection

from app.db.session import Base

logger = logging.getLogger("homecare.db")


def sync_missing_columns(conn: Connection) -> list[str]:
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())
    preparer = conn.dialect.identifier_preparer
    added: list[str] = []

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing_cols:
                continue
            col_type = column.type.compile(dialect=conn.dialect)
            conn.exec_driver_sql(
                f"ALTER TABLE {preparer.quote(table.name)} ADD COLUMN {preparer.quote(column.name)} {col_type}"
            )
            added.append(f"{table.name}.{column.name}")

    if added:
        logger.info("Added missing columns: %s", ", ".join(added))
    return added


def init_schema(conn: Connection) -> list[str]:
    # Import models so they are registered on Base.metadata
    from app.models import user, domain  # noqa: F401

    Base.metadata.create_all(conn)
    return sync_missing_columns(conn)
