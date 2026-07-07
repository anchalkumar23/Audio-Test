SCRIPTS = [
    {
        "id": "news",
        "title": "News Report",
        "category": "Formal",
        "text": (
            "Scientists have confirmed the discovery of a new species of deep-sea fish "
            "in the Pacific Ocean. The creature, which lives more than three thousand "
            "meters below the surface, has adapted to survive in complete darkness. "
            "Researchers believe it could provide valuable insights into the evolution "
            "of life in extreme environments. The findings were published yesterday in "
            "the journal Nature."
        ),
    },
    {
        "id": "science",
        "title": "Science and Nature",
        "category": "Educational",
        "text": (
            "The human brain contains approximately eighty-six billion neurons, each "
            "connected to thousands of others through synapses. These connections form "
            "a vast network that processes information, stores memories, and generates "
            "consciousness. Scientists are still working to understand how individual "
            "neurons give rise to complex thoughts and emotions. Modern imaging "
            "technology has revealed that the brain remains active even during sleep."
        ),
    },
    {
        "id": "travel",
        "title": "Travel and Geography",
        "category": "Descriptive",
        "text": (
            "The Himalayas stretch across five countries in South Asia, forming the "
            "highest mountain range on Earth. Mount Everest, at eight thousand eight "
            "hundred and forty-nine meters, attracts climbers from around the world "
            "every year. The region is also home to unique ecosystems and diverse "
            "cultures. Thousands of rivers originate in these mountains, providing "
            "freshwater to nearly two billion people downstream."
        ),
    },
    {
        "id": "health",
        "title": "Health and Lifestyle",
        "category": "Advisory",
        "text": (
            "Regular physical activity has been shown to reduce the risk of chronic "
            "diseases, including heart disease, diabetes, and certain types of cancer. "
            "Health experts recommend at least one hundred and fifty minutes of "
            "moderate exercise per week for adults. In addition to physical benefits, "
            "exercise improves mental health by releasing endorphins and reducing "
            "stress hormones. Even a short daily walk can make a significant difference "
            "to overall wellbeing."
        ),
    },
    {
        "id": "technology",
        "title": "Technology",
        "category": "Technical",
        "text": (
            "Artificial intelligence is transforming industries at an unprecedented "
            "rate. Machine learning models can now diagnose diseases, translate "
            "languages, and generate realistic images from text descriptions. However, "
            "experts warn that these systems can reflect biases present in their "
            "training data. Ensuring that artificial intelligence is developed "
            "responsibly and transparently remains one of the most important challenges "
            "facing the technology industry today."
        ),
    },
]


def get_script(script_id: str) -> dict | None:
    return next((s for s in SCRIPTS if s["id"] == script_id), None)
