"""create activities table

Revision ID: 0001
Revises: 
Create Date: 2026-09-17 22:25:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="OTHER"),
        sa.Column("priority", sa.String(length=50), nullable=False, server_default="MEDIUM"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="PENDING"),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("recurrence", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("reminder_minutes_before", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("needs_clarification", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("clarification_question", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_activities_id", "activities", ["id"], unique=False)
    op.create_index("ix_activities_status", "activities", ["status"], unique=False)
    op.create_index("ix_activities_category", "activities", ["category"], unique=False)
    op.create_index("ix_activities_start_datetime", "activities", ["start_datetime"], unique=False)
    op.create_index("ix_activities_due_datetime", "activities", ["due_datetime"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_activities_due_datetime", table_name="activities")
    op.drop_index("ix_activities_start_datetime", table_name="activities")
    op.drop_index("ix_activities_category", table_name="activities")
    op.drop_index("ix_activities_status", table_name="activities")
    op.drop_index("ix_activities_id", table_name="activities")
    op.drop_table("activities")
