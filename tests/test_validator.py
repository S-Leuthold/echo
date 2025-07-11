from echo.config_loader import load_config

def test_good_config_validates():
    cfg = load_config("config/user_config.yaml")
    # If load_config returns without raising, validator passed
    assert cfg.defaults.wake_time == "05:25"
