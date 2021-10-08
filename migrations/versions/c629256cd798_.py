"""empty message

Revision ID: c629256cd798
Revises: 1da80d6f9c49
Create Date: 2021-10-01 11:04:47.959331

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c629256cd798'
down_revision = '1da80d6f9c49'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('video_data', sa.Column('created_by_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'video_data', 'users', ['created_by_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'video_data', type_='foreignkey')
    op.drop_column('video_data', 'created_by_id')
    # ### end Alembic commands ###
