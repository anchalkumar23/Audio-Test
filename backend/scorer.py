import io
import re
from collections import defaultdict
from pydub import AudioSegment


def _load_cmudict() -> dict:
    """Load CMU dict data file without importing the cmudict package (avoids pkg_resources)."""
    import importlib.util
    import pathlib

    spec = importlib.util.find_spec("cmudict")
    if not spec or not spec.origin:
        raise ImportError("cmudict package not found")
    data_file = pathlib.Path(spec.origin).parent / "data" / "cmudict.dict"
    d: dict = defaultdict(list)
    with open(data_file, "rb") as f:
        for line in f:
            parts = line.decode("utf-8").strip().split("#")[0].split()
            if len(parts) >= 2:
                word = re.sub(r"\(\d+\)$", "", parts[0]).lower()
                d[word].append(parts[1:])
    return d


_CMU_DICT = _load_cmudict()  # loaded once at startup


def validate_duration(audio_bytes: bytes) -> float:
    """
    Validate audio is 30–45 seconds.
    Returns duration in seconds. Raises ValueError if out of range.
    """
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
    duration = len(audio) / 1000.0
    if duration < 30:
        raise ValueError(f"Audio is {duration:.1f}s — minimum is 30 seconds.")
    if duration > 45:
        raise ValueError(f"Audio is {duration:.1f}s — maximum is 45 seconds.")
    return duration


def get_phonemes(word: str) -> list[str]:
    """Return CMU phoneme list for word. Falls back to char list if unknown."""
    entries = _CMU_DICT.get(word.lower())
    if entries:
        return entries[0]  # first pronunciation
    return list(word.lower())


def phoneme_edit_distance(seq1: list[str], seq2: list[str]) -> int:
    """Levenshtein distance between two phoneme sequences."""
    m, n = len(seq1), len(seq2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        new_dp = [i] + [0] * n
        for j in range(1, n + 1):
            if seq1[i - 1] == seq2[j - 1]:
                new_dp[j] = dp[j - 1]
            else:
                new_dp[j] = 1 + min(dp[j], new_dp[j - 1], dp[j - 1])
        dp = new_dp
    return dp[n]


def word_phoneme_score(expected: str, heard: str) -> float:
    """Phoneme similarity score 0–1 between two words."""
    exp = get_phonemes(expected)
    got = get_phonemes(heard)
    max_len = max(len(exp), len(got))
    if max_len == 0:
        return 1.0
    dist = phoneme_edit_distance(exp, got)
    return max(0.0, 1.0 - dist / max_len)


def tag_word(score: float) -> str:
    if score >= 0.85:
        return "correct"
    if score >= 0.60:
        return "unclear"
    return "mispronounced"


def _tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split to words."""
    return re.findall(r"[a-z]+", text.lower())


def align_words(script_words: list[str], transcript_words: list[dict]) -> list[dict]:
    """
    Align transcript words to script words using DP sequence alignment.
    transcript_words: list of {word, probability, start?, end?}
    Returns list of {script_word, transcript_word, score, tag}
    """
    t_words = [w["word"].strip().lower() for w in transcript_words]
    s_words = [w.lower() for w in script_words]
    n, m = len(s_words), len(t_words)

    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if s_words[i - 1] == t_words[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])

    alignment = []
    i, j = n, m
    while i > 0:
        if j > 0 and dp[i][j] == dp[i - 1][j - 1] + (0 if s_words[i - 1] == t_words[j - 1] else 1):
            tw = transcript_words[j - 1]
            ph_score = word_phoneme_score(s_words[i - 1], t_words[j - 1])
            whisper_conf = tw.get("probability", 0.8)
            combined = ph_score * (0.5 + 0.5 * whisper_conf)
            alignment.append({
                "script_word": script_words[i - 1],
                "transcript_word": tw["word"].strip(),
                "score": round(combined, 3),
                "tag": tag_word(combined),
            })
            i -= 1
            j -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            j -= 1
        else:
            alignment.append({
                "script_word": script_words[i - 1],
                "transcript_word": None,
                "score": 0.0,
                "tag": "missing",
            })
            i -= 1

    return list(reversed(alignment))


def compute_fluency(transcript_words: list[dict]) -> float:
    """Score 0–1: penalize pauses > 1.5s between consecutive words."""
    if len(transcript_words) < 2:
        return 1.0
    pauses = [
        transcript_words[i]["start"] - transcript_words[i - 1]["end"]
        for i in range(1, len(transcript_words))
    ]
    long_pauses = sum(1 for p in pauses if p > 1.5)
    return max(0.0, 1.0 - long_pauses / len(pauses))


def score_pronunciation(script_text: str, transcript_words: list[dict]) -> dict:
    """
    Main scoring function.
    Returns {score, words, word_accuracy, fluency, completeness}
    """
    script_words = _tokenize(script_text)
    if not script_words:
        raise ValueError("Script is empty.")

    aligned = align_words(script_words, transcript_words)

    non_missing = [w for w in aligned if w["tag"] != "missing"]
    word_accuracy = (
        sum(w["score"] for w in non_missing) / len(non_missing) if non_missing else 0.0
    )
    fluency = compute_fluency(transcript_words)
    completeness = len(non_missing) / len(script_words)

    final = (0.60 * word_accuracy + 0.25 * fluency + 0.15 * completeness) * 100

    return {
        "score": round(final, 1),
        "words": [
            {"word": w["script_word"], "tag": w["tag"], "score": w["score"]}
            for w in aligned
        ],
        "word_accuracy": round(word_accuracy * 100, 1),
        "fluency": round(fluency * 100, 1),
        "completeness": round(completeness * 100, 1),
    }
