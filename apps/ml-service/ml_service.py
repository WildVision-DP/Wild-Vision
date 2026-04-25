from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import io
import uvicorn
import re
import threading
import torch

app = FastAPI()

# Allow CORS for API calls from Node.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = None
model = None
model_loading = False
model_lock = threading.Lock()


def get_model():
    """Load BLIP lazily so /health is reachable even before model download finishes."""
    global processor, model, model_loading

    if processor is not None and model is not None:
        return processor, model

    with model_lock:
        if processor is None or model is None:
            model_loading = True
            print("Loading BLIP image captioning model...")
            try:
                processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
                model = BlipForConditionalGeneration.from_pretrained(
                    "Salesforce/blip-image-captioning-base"
                )
                model.eval()
                print("BLIP model loaded successfully!")
            finally:
                model_loading = False

    return processor, model


def warm_model_in_background():
    try:
        get_model()
    except Exception as exc:
        print(f"BLIP model warmup failed: {exc}")


@app.on_event("startup")
async def startup_event():
    threading.Thread(target=warm_model_in_background, daemon=True).start()

# List of animals to recognize (common names)
ANIMAL_KEYWORDS = {
    # Big Cats
    "tiger", "lion", "leopard", "cheetah", "jaguar", "cougar", "lynx", "bobcat", "panther", "puma",
    # Canines
    "wolf", "dog", "cat", "fox", "jackal", "hyena", "coyote",
    # Primates
    "monkey", "ape", "gorilla", "chimpanzee", "orangutan", "baboon", "macaque",
    # Herbivores
    "deer", "elk", "moose", "reindeer", "antelope", "gazelle", "wildebeest", "zebra", "giraffe",
    "buffalo", "bison", "ox", "cattle", "goat", "sheep", "camel", "horse",
    # Bears
    "bear", "grizzly", "panda", "sloth",
    # Other Mammals
    "elephant", "rhinoceros", "hippo", "hippopotamus", "warthog", "porcupine", "badger",
    "otter", "beaver", "muskrat", "rabbit", "hare", "squirrel", "chipmunk", "prairie dog",
    "hedgehog", "raccoon", "skunk", "mongoose", "meerkat",
    # Reptiles
    "snake", "python", "cobra", "viper", "crocodile", "alligator", "lizard", "iguana", "turtle", "tortoise",
    # Birds
    "eagle", "hawk", "falcon", "owl", "vulture", "crane", "stork", "heron", "egret", "goose", "duck",
    "swan", "parrot", "peacock", "pheasant", "grouse", "ostrich", "emu", "tern", "albatross", "penguin",
    # Fish (aquatic)
    "fish", "shark", "salmon", "trout",
    # Insects
    "butterfly", "bee", "dragonfly", "beetle", "grasshopper", "cricket",
}

def extract_animal_from_caption(caption: str) -> tuple[str, dict]:
    """
    Extract animal name from BLIP caption using keyword matching
    
    Returns:
        tuple: (animal_name, metadata)
    """
    caption_lower = caption.lower()
    
    # Find matching animals in caption
    found_animals = []
    for animal in ANIMAL_KEYWORDS:
        if re.search(rf"\b{re.escape(animal)}\b", caption_lower):
            found_animals.append(animal)
    
    # If multiple animals found, pick the longest name (most specific)
    if found_animals:
        best_animal = max(found_animals, key=len)
        confidence = 0.85  # Confidence based on keyword matching
        return best_animal.capitalize(), {"confidence": confidence, "method": "keyword_match"}
    
    # Fallback: try to extract the first noun (simplified extraction)
    # This is a basic approach - for better results, use spaCy or similar
    words = [w for w in caption_lower.split() if w.isalpha()]
    
    if words:
        # Return the first significant word after articles
        articles = {"a", "an", "the", "of", "in", "on", "at", "by", "is", "are", "a", "with", "to"}
        main_words = [w for w in words if w not in articles and len(w) > 2]
        
        if main_words:
            return main_words[0].capitalize(), {"confidence": 0.60, "method": "noun_extraction"}
    
    return "Unknown", {"confidence": 0.0, "method": "fallback"}



@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "BLIP Animal Detection ML Service",
        "model_loaded": processor is not None and model is not None,
        "model_loading": model_loading,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Predict animal from image using BLIP captioning model
    
    Returns:
    {
        "caption": "a tiger walking in the jungle",
        "animal": "Tiger",
        "confidence": 0.85,
        "method": "BLIP Captioning"
    }
    """
    try:
        # Read and process image
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        # Process with BLIP
        current_processor, current_model = get_model()
        inputs = current_processor(image, return_tensors="pt")
        with torch.inference_mode():
            out = current_model.generate(**inputs, max_length=50)
        caption = current_processor.decode(out[0], skip_special_tokens=True)
        
        # Extract animal from caption
        animal, metadata = extract_animal_from_caption(caption)
        
        return {
            "caption": caption,
            "animal": animal,
            "confidence": metadata.get("confidence", 0.0),
            "method": "BLIP Captioning",
            "metadata": metadata
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")


if __name__ == "__main__":
    print("\n🐯 Starting Animal Detection ML Service on http://localhost:8000")
    print("API docs available at http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
