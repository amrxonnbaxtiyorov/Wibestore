"""add missing columns to users and transactions

Revision ID: 003
Revises: 002
Create Date: 2026-03-05

Adds columns that were missing from migration 001 but exist in models:
- users: username, first_name, last_name, is_banned, updated_at
- transactions: admin_note, ip_address

All additions are idempotent (skip if column already exists).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table: str, column: str) -> bool:
    inspector = inspect(conn)
    return any(c["name"] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    conn = op.get_bind()

    # ── users table ──────────────────────────────────────────────────────────
    if not _column_exists(conn, "users", "username"):
        op.add_column("users", sa.Column("username", sa.String(255), nullable=True))

    if not _column_exists(conn, "users", "first_name"):
        op.add_column("users", sa.Column("first_name", sa.String(255), nullable=True))

    if not _column_exists(conn, "users", "last_name"):
        op.add_column("users", sa.Column("last_name", sa.String(255), nullable=True))

    if not _column_exists(conn, "users", "is_banned"):
        op.add_column(
            "users",
            sa.Column("is_banned", sa.Boolean(), nullable=False, server_default="false"),
        )

    if not _column_exists(conn, "users", "updated_at"):
        op.add_column(
            "users",
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            ),
        )

    # ── transactions table ───────────────────────────────────────────────────
    if not _column_exists(conn, "transactions", "admin_note"):
        op.add_column("transactions", sa.Column("admin_note", sa.Text(), nullable=True))

    if not _column_exists(conn, "transactions", "ip_address"):
        op.add_column("transactions", sa.Column("ip_address", sa.String(45), nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "ip_address")
    op.drop_column("transactions", "admin_note")
    op.drop_column("users", "updated_at")
    op.drop_column("users", "is_banned")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "username")
