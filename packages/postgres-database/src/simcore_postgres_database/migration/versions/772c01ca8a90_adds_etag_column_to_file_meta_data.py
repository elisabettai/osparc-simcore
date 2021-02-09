"""Adds etag column to file_meta_data

Revision ID: 772c01ca8a90
Revises: ee62bf5e40b9
Create Date: 2021-01-27 14:20:17.491041+00:00

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "772c01ca8a90"
down_revision = "ee62bf5e40b9"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("file_meta_data", sa.Column("entity_tag", sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("file_meta_data", "entity_tag")
    # ### end Alembic commands ###