import json
import os
from datetime import datetime

SCORES_FILE = "scores.jsonl"

def log_score(goal: str, critic_score: int, revision_count: int) -> None:
    """
    Append one run's score as a JSON line to SCORES_FILE.
    Fields to include: timestamp, goal, critic_score, revision_count.
    Use datetime.now().isoformat() for the timestamp.
    Open the file in append mode ("a"), write json.dumps(...) + "\n".
    """
    # TODO: build the record dict
    record = {
        "timestamp": datetime.now().isoformat(),
        "goal": goal,
        "critic_score": critic_score,
        "revision_count": revision_count,
    }
    # TODO: open SCORES_FILE in append mode and write the line
    with open(SCORES_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

def get_average_score() -> float:
    """
    Read every line in SCORES_FILE, parse as JSON, pull out critic_score,
    and return the mean. Return 0.0 if the file doesn't exist or is empty.
    """
    # TODO: handle file-not-found (no runs logged yet)
    if not os.path.exists(SCORES_FILE):
        return 0.0
    # TODO: read lines, json.loads each, collect critic_score values
    with open(SCORES_FILE, "r") as f:
        scores = [json.loads(line) for line in f if line.strip()]
    # TODO: return sum(scores) / len(scores), guarding divide-by-zero
    if not scores:
        return 0.0
    return sum(score["critic_score"]for score in scores) / len(scores)  