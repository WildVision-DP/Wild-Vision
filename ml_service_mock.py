"""
Fast Mock ML Service for Testing
Provides instant animal detection for testing without model download

This is a development-only service that returns realistic detections based on image analysis.
Replace this with the real ml_service.py once the model finishes downloading.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import random
import uvicorn

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock animal database (from Tadoba Andhari Tiger Reserve)
ANIMALS = [
    {"name": "Tiger", "scientific": "panthera-tigris", "base_confidence": 0.85},
    {"name": "Leopard", "scientific": "panthera-pardus", "base_confidence": 0.78},
    {"name": "Forest Deer", "scientific": "axis-axis", "base_confidence": 0.81},
    {"name": "Wild Boar", "scientific": "sus-scrofa", "base_confidence": 0.76},
    {"name": "Asian Elephant", "scientific": "elephas-maximus", "base_confidence": 0.92},
    {"name": "Sloth Bear", "scientific": "melursus-ursinus", "base_confidence": 0.79},
    {"name": "Indian Buffalo", "scientific": "syncerus-caffer", "base_confidence": 0.88},
    {"name": "Spotted Hyena", "scientific": "crocuta-crocuta", "base_confidence": 0.74},
]

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Animal Detection ML Service (Mock - Development Mode)",
        "mode": "mock"
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Enhanced Mock animal detection with image-based analysis.
    
    Returns realistic predictions based on image characteristics.
    This is a development/test endpoint. Production uses real Hugging Face model.
    """
    try:
        # Read and validate image
        content = await file.read()
        if len(content) < 1000:  # Sanity check
            raise ValueError("Image too small")
        
        try:
            image = Image.open(io.BytesIO(content)).convert("RGB")
            size = image.size
            pixels = image.tobytes()
        except Exception as e:
            print(f"Error processing image: {e}")
            return {
                "label": "Tiger",
                "scientific_name": "panthera-tigris",
                "score": 0.87,
                "mode": "mock"
            }
        
        # Analyze image characteristics for "realistic" detection
        # Calculate average pixel values to influence animal selection
        pixel_array = image.convert("RGB")
        avg_r = sum(pixel_array.tobytes()[::3]) / (len(image.tobytes()) // 3) if len(image.tobytes()) > 0 else 128
        
        # Select animal based on image analysis
        # This creates consistency: similar images get similar detections
        random.seed(int(avg_r) % 100)
        selected_animal = random.choice(ANIMALS)
        random.seed()  # Reset seed
        
        # Generate realistic confidence score
        # Higher for larger, clearer images
        image_quality = min(1.0, (size[0] * size[1]) / 1000000.0)  # Larger = higher quality
        base_conf = selected_animal["base_confidence"]
        variance = random.uniform(-0.08, 0.12)
        confidence = max(0.65, min(0.99, base_conf + variance + (image_quality * 0.05)))
        
        # Generate multiple predictions (like real ML model returns)
        # Sort by confidence
        all_animals = ANIMALS.copy()
        random.shuffle(all_animals)
        
        results = []
        for i, animal in enumerate(all_animals):
            if animal["name"] == selected_animal["name"]:
                # Top prediction
                results.append({
                    "label": animal["name"],
                    "score": round(confidence, 4)
                })
            else:
                # Other predictions with lower confidence
                other_score = round(random.uniform(0.1, 0.4), 4)
                results.append({
                    "label": animal["name"],
                    "score": other_score
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "label": selected_animal["name"],
            "scientific_name": selected_animal["scientific"],
            "score": round(confidence, 4),
            "results": results[:5]  # Top 5 predictions
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Detection error: {str(e)}")

if __name__ == "__main__":
    print("\n🚀 Starting MOCK Animal Detection Service on http://localhost:8000")
    print("📝 This is a fast mock for testing - NOT using real ML model")
    print("💡 Real Hugging Face model is downloading in background...")
    print("📚 API docs available at http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
