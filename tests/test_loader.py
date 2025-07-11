from echo.config_loader import load_config, ConfigKeyError
import pytest

GOOD_PATH = "config/user_config.yaml"
BAD_PATH  = "tests/fixtures/bad_missing_key.yaml"


def test_good_config_loads():
    cfg = load_config(GOOD_PATH)
    assert cfg.defaults.wake_time == "05:25"


def test_missing_key_raises():
    with pytest.raises(ConfigKeyError):
        load_config(BAD_PATH)
