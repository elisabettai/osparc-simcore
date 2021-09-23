"""restores temporary projects_snapshots table

Revision ID: a2a020b67bd2
Revises: 0208f6b32f32
Create Date: 2021-09-09 16:49:57.696337+00:00

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "a2a020b67bd2"
down_revision = "0208f6b32f32"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "projects_snapshots",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("parent_uuid", sa.String(), nullable=False),
        sa.Column("project_uuid", sa.String(), nullable=False),
        sa.Column("deleted", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["parent_uuid"],
            ["projects.uuid"],
            name="fk_snapshots_parent_uuid_projects",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_uuid"],
            ["projects.uuid"],
            name="fk_snapshots_project_uuid_projects",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "parent_uuid", "created_at", name="snapshot_from_project_uniqueness"
        ),
        sa.UniqueConstraint("project_uuid"),
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table("projects_snapshots")
    # ### end Alembic commands ###