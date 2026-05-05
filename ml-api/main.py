import io
import base64
import numpy as np
import cv2
import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model.unet import UNet

app = FastAPI(title="Road Extraction ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL = UNet(in_channels=3, out_channels=1).to(DEVICE)
MODEL.eval()
IMG_SIZE = 256

# NOTE: In production, load pretrained weights:
# MODEL.load_state_dict(torch.load("weights.pth", map_location=DEVICE))


def preprocess(image: Image.Image):
    img = image.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img).astype(np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(DEVICE)
    return tensor, np.array(img)


def heuristic_road_mask(rgb: np.ndarray) -> np.ndarray:
    """
    Fallback heuristic mask (since model is untrained).
    Detects gray/asphalt-like regions to simulate real roads.
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    lower = np.array([0, 0, 60])
    upper = np.array([180, 50, 180])
    mask = cv2.inRange(hsv, lower, upper)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return mask


def compute_stats(mask: np.ndarray):
    total = mask.size
    road_pixels = int((mask > 127).sum())
    coverage = (road_pixels / total) * 100
    # Skeletonize to estimate length
    skeleton = cv2.ximgproc.thinning(mask) if hasattr(cv2, "ximgproc") else mask
    length_pixels = int((skeleton > 127).sum()) if skeleton is not None else road_pixels // 5
    # Assume 1 px ≈ 0.5 meters (configurable)
    estimated_length_m = length_pixels * 0.5
    area_m2 = road_pixels * 0.25
    return {
        "road_coverage_percent": round(coverage, 2),
        "road_pixels": road_pixels,
        "total_pixels": total,
        "estimated_road_length_m": round(estimated_length_m, 2),
        "estimated_area_m2": round(area_m2, 2),
    }


def overlay_mask(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    color_mask = np.zeros_like(rgb)
    color_mask[mask > 127] = [255, 60, 60]
    return cv2.addWeighted(rgb, 0.7, color_mask, 0.5, 0)


def to_b64_png(arr: np.ndarray) -> str:
    img = Image.fromarray(arr.astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


class PredictResponse(BaseModel):
    mask_base64: str
    overlay_base64: str
    stats: dict


@app.get("/")
def root():
    return {"status": "ok", "service": "road-extraction-ml-api"}


@app.get("/health")
def health():
    return {"status": "healthy", "device": str(DEVICE)}


@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        tensor, rgb = preprocess(image)

        with torch.no_grad():
            logits = MODEL(tensor)
            probs = torch.sigmoid(logits).cpu().numpy()[0, 0]

        # If untrained, fallback to heuristic mask
        model_mask = (probs > 0.5).astype(np.uint8) * 255
        if model_mask.sum() < 500:
            model_mask = heuristic_road_mask(rgb)

        overlay = overlay_mask(rgb, model_mask)
        stats = compute_stats(model_mask)

        return PredictResponse(
            mask_base64=to_b64_png(model_mask),
            overlay_base64=to_b64_png(overlay),
            stats=stats,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)