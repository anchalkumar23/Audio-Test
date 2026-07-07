import io
import pytest
from pydub import AudioSegment
from scorer import (
    validate_duration,
    get_phonemes,
    phoneme_edit_distance,
    word_phoneme_score,
    tag_word,
    align_words,
    compute_fluency,
    score_pronunciation,
)


def make_wav(duration_ms: int) -> bytes:
    audio = AudioSegment.silent(duration=duration_ms)
    buf = io.BytesIO()
    audio.export(buf, format="wav")
    return buf.getvalue()


# --- duration ---

def test_valid_duration_passes():
    audio = make_wav(35_000)
    duration = validate_duration(audio)
    assert 30 <= duration <= 45


def test_too_short_raises():
    audio = make_wav(20_000)
    with pytest.raises(ValueError, match="30"):
        validate_duration(audio)


def test_too_long_raises():
    audio = make_wav(50_000)
    with pytest.raises(ValueError, match="45"):
        validate_duration(audio)


# --- phonemes ---

def test_get_phonemes_known_word():
    phones = get_phonemes("quick")
    assert isinstance(phones, list) and len(phones) > 0

def test_get_phonemes_unknown_word():
    phones = get_phonemes("xyzqwerty")
    assert isinstance(phones, list)

def test_phoneme_edit_distance_identical():
    assert phoneme_edit_distance(["K", "W", "IH1", "K"], ["K", "W", "IH1", "K"]) == 0

def test_phoneme_edit_distance_one_diff():
    assert phoneme_edit_distance(["K", "W", "IH1", "K"], ["K", "W", "IY1", "K"]) == 1

def test_word_phoneme_score_same_word():
    assert word_phoneme_score("quick", "quick") == 1.0

def test_word_phoneme_score_different_word():
    score = word_phoneme_score("quick", "quack")
    assert 0.0 <= score < 1.0

def test_tag_correct():
    assert tag_word(0.90) == "correct"

def test_tag_unclear():
    assert tag_word(0.70) == "unclear"

def test_tag_mispronounced():
    assert tag_word(0.40) == "mispronounced"


# --- alignment ---

def test_align_words_perfect():
    script = ["the", "quick", "brown", "fox"]
    transcript = [
        {"word": "the", "probability": 0.99},
        {"word": "quick", "probability": 0.95},
        {"word": "brown", "probability": 0.93},
        {"word": "fox", "probability": 0.97},
    ]
    result = align_words(script, transcript)
    assert len(result) == 4
    assert all(r["transcript_word"] is not None for r in result)


def test_align_words_missing():
    script = ["the", "quick", "brown", "fox"]
    transcript = [
        {"word": "the", "probability": 0.99},
        {"word": "brown", "probability": 0.93},
        {"word": "fox", "probability": 0.97},
    ]
    result = align_words(script, transcript)
    missing = [r for r in result if r["transcript_word"] is None]
    assert len(missing) == 1
    assert missing[0]["script_word"] == "quick"


# --- fluency ---

def test_compute_fluency_no_pauses():
    words = [
        {"start": 0.0, "end": 0.3},
        {"start": 0.35, "end": 0.65},
        {"start": 0.7, "end": 1.0},
    ]
    assert compute_fluency(words) == 1.0


def test_compute_fluency_long_pause():
    words = [
        {"start": 0.0, "end": 0.3},
        {"start": 2.5, "end": 2.8},
    ]
    assert compute_fluency(words) < 1.0


# --- full score ---

def test_score_pronunciation_returns_expected_keys():
    result = score_pronunciation(
        script_text="the quick brown fox",
        transcript_words=[
            {"word": "the", "start": 0.0, "end": 0.2, "probability": 0.99},
            {"word": "quick", "start": 0.3, "end": 0.6, "probability": 0.97},
            {"word": "brown", "start": 0.7, "end": 1.0, "probability": 0.96},
            {"word": "fox", "start": 1.1, "end": 1.4, "probability": 0.98},
        ],
    )
    assert "score" in result
    assert "words" in result
    assert "word_accuracy" in result
    assert "fluency" in result
    assert "completeness" in result
    assert result["score"] > 0
    assert len(result["words"]) == 4
