from pathlib import Path

import pytest

from api import main


def test_configured_relative_paths_resolve_from_project_root(monkeypatch):
    monkeypatch.setenv("MODEL_PATH", "custom/model.joblib")

    assert main._configured_path("MODEL_PATH", Path("Models") / "model.joblib") == (
        main.ROOT / "custom" / "model.joblib"
    )


def test_configured_absolute_paths_are_preserved(monkeypatch, tmp_path):
    absolute_path = tmp_path / "model.joblib"
    monkeypatch.setenv("MODEL_PATH", str(absolute_path))

    assert main._configured_path(
        "MODEL_PATH", Path("Models") / "model.joblib"
    ) == absolute_path


def test_frontend_origins_are_exact_and_can_be_comma_separated():
    assert main._parse_frontend_origins(
        " https://econocausal.vercel.app/, https://preview.example.com "
    ) == ["https://econocausal.vercel.app", "https://preview.example.com"]


@pytest.mark.parametrize(
    "origin",
    [
        "https://example.com/path",
        "https://*.vercel.app",
        "*",
        "file://example.com",
    ],
)
def test_frontend_origin_rejects_paths_wildcards_and_non_http_schemes(origin):
    with pytest.raises(RuntimeError, match="exact http"):
        main._parse_frontend_origins(origin)


def test_render_requires_frontend_origin():
    with pytest.raises(RuntimeError, match="must be set on Render"):
        main._parse_frontend_origins("", required=True)


def test_cors_is_restricted_to_configured_origin_and_local_development():
    cors = next(
        middleware
        for middleware in main.app.user_middleware
        if middleware.cls is main.CORSMiddleware
    )

    assert cors.kwargs["allow_origins"] == main.FRONTEND_ORIGINS
    assert cors.kwargs["allow_origin_regex"] == main.LOCAL_ORIGIN_REGEX
    assert cors.kwargs["allow_origins"] != ["*"]
