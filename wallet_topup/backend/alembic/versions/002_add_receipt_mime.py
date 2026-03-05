"""add receipt_mime column to transactions

Revision ID: 002
Revises: 001
Create Date: 2026-03-05

For existing deployments where 001_initial was applied without receipt_mime.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add receipt_mime only if it doesn't already exist (idempotent)
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("transactions")]
    if "receipt_mime" not in columns:
        op.add_column(
            "transactions",
            sa.Column("receipt_mime", sa.String(64), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("transactions", "receipt_mime")
