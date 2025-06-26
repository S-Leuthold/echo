import click
from echo import scheduler, reflection, log_writer, config

@click.group()
def cli():
    """Echo: your daily planning and reflection assistant."""
    pass

@cli.command()
def new():
    """Generate today's scaffold and initialize the daily log."""
    config_data = config.load_config("config/user_config.yaml")
    blocks = scheduler.generate_schedule(config_data)
    log_writer.write_scaffold(blocks)

@cli.command()
def reflect():
    """Prompt for and record a reflection block."""
    prompts = config.load_config("config/user_config.yaml")["daily_questions"]
    responses = reflection.run_reflection(prompts)
    log_writer.append_reflection(responses)

@cli.command()
@click.argument("note")
def log(note):
    """Log an event or change to the current day."""
    log_writer.append_note(note)

if __name__ == "__main__":
    cli()
