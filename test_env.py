# test_env.py
import os
from dotenv import load_dotenv

load_dotenv()
print("CLIENT_ID:", os.environ.get("ECHO_GRAPH_CLIENT_ID"))
print("CLIENT_SECRET:", os.environ.get("ECHO_GRAPH_CLIENT_SECRET"))
print("REDIRECT_URI:", os.environ.get("ECHO_GRAPH_REDIRECT_URI"))