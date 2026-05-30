import pytest

from app.memory import database


@pytest.fixture(autouse=True)
def _use_temp_db(tmp_path):
    db_path = tmp_path / "test.db"
    database.DB_PATH = db_path
    database.init_database()
    yield
