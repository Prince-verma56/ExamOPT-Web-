import os
import pytest
from app.database import reset_repository, DatabaseBackend

@pytest.fixture(autouse=True)
def ensure_clean_test_database_state(request):
    """
    Ensures unit tests have a clean repository state and standard test suites
    default to local SQLite unless explicitly testing cloud adapters.
    """
    reset_repository()
    # Save environment state
    orig_backend = os.environ.get("DATABASE_BACKEND")
    
    # If running general unit tests (algorithms, validation, api), default to sqlite for determinism
    if "test_database_adapters" not in request.node.nodeid:
        os.environ["DATABASE_BACKEND"] = "sqlite"
        reset_repository()

    yield

    reset_repository()
    if orig_backend is not None:
        os.environ["DATABASE_BACKEND"] = orig_backend
    else:
        os.environ.pop("DATABASE_BACKEND", None)
