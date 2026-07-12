from config import Settings


def test_single_origin():
    settings = Settings(frontend_origins="http://localhost:3000")
    assert settings.frontend_origins_list == ["http://localhost:3000"]


def test_multiple_origins_with_whitespace():
    settings = Settings(frontend_origins=" http://localhost:3000 , https://example.com ")
    assert settings.frontend_origins_list == ["http://localhost:3000", "https://example.com"]


def test_empty_origins_string():
    settings = Settings(frontend_origins="")
    assert settings.frontend_origins_list == []
