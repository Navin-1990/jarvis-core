"""
Object Detection Module - Identifies objects in images
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np

from app.core.logger import Logger


@dataclass
class ObjectDetectionResult:
    """Represents a detected object."""
    label: str
    confidence: float
    bbox: tuple[int, int, int, int]  # x, y, width, height
    category: str = "object"


class ObjectDetection:
    """Object detection system for JARVIS vision."""
    
    # Common object categories
    CATEGORIES = {
        "electronics": ["phone", "laptop", "computer", "monitor", "keyboard", "mouse", "tv", "remote", "headphones", "speaker", "camera"],
        "office": ["pen", "paper", "book", "notebook", "stapler", "folder", "desk", "chair", "lamp"],
        "food": ["cup", "mug", "bottle", "plate", "fork", "knife", "spoon", "glass", "food", "fruit", "vegetable"],
        "furniture": ["table", "chair", "sofa", "couch", "bed", "shelf", "cabinet", "drawer", "lamp"],
        "clothing": ["shirt", "pants", "jacket", "shoe", "hat", "glasses", "watch", "bag", "backpack"],
        "vehicle": ["car", "bicycle", "motorcycle", "bus", "truck", "train"],
        "person": ["person", "face", "hand", "finger"],
        "animal": ["dog", "cat", "bird", "fish", "horse", "cow"],
    }
    
    def __init__(self) -> None:
        self._model = None
        self._initialized = False
        self._labels: list[str] = []
    
    async def initialize(self) -> bool:
        """Initialize object detection model."""
        try:
            # Try to use Ultralytics YOLO
            from ultralytics import YOLO
            
            # Load a small YOLO model
            self._model = YOLO('yolov8n.pt')
            self._labels = self._model.names
            self._initialized = True
            Logger.success("Object detection (YOLO) initialized")
            return True
            
        except ImportError:
            Logger.warn("YOLO not available, using basic object detection")
            # Fallback to basic detection
            self._labels = [
                "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
                "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
                "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
                "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
                "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
                "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
                "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
                "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
                "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator"
            ]
            self._initialized = True
            return True
            
        except Exception as e:
            Logger.error(f"Object detection initialization error: {e}")
            return False
    
    async def detect_objects(self, image: np.ndarray) -> list[ObjectDetectionResult]:
        """Detect objects in an image."""
        if not self._initialized:
            return []
        
        try:
            if self._model is not None and hasattr(self._model, 'predict'):
                # Use YOLO
                results = self._model.predict(image, verbose=False)
                
                detections = []
                for result in results:
                    boxes = result.boxes
                    for box in boxes:
                        label_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        
                        # Get bounding box
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        bbox = (int(x1), int(y1), int(x2 - x1), int(y2 - y1))
                        
                        label = self._labels[label_id] if label_id < len(self._labels) else "object"
                        category = self._get_category(label)
                        
                        detections.append(ObjectDetectionResult(
                            label=label,
                            confidence=confidence,
                            bbox=bbox,
                            category=category,
                        ))
                
                return detections
            else:
                # Basic fallback - just return a generic detection
                return []
                
        except Exception as e:
            Logger.error(f"Object detection error: {e}")
            return []
    
    def _get_category(self, label: str) -> str:
        """Get the category for an object label."""
        label_lower = label.lower()
        for category, keywords in self.CATEGORIES.items():
            if label_lower in keywords:
                return category
        return "object"
    
    async def identify_object(self, image: np.ndarray) -> str:
        """Identify what object is shown in the image."""
        detections = await self.detect_objects(image)
        
        if not detections:
            return "I don't see any recognizable objects in the frame."
        
        # Sort by confidence
        detections.sort(key=lambda x: x.confidence, reverse=True)
        
        # Build description
        top_objects = detections[:5]  # Top 5 objects
        descriptions = []
        
        for obj in top_objects:
            if obj.confidence > 0.5:  # Only include confident detections
                descriptions.append(f"{obj.label} ({obj.confidence:.0%} confidence)")
        
        if not descriptions:
            return "I can see something, but I'm not confident enough to identify it."
        
        if len(descriptions) == 1:
            return f"This appears to be a {descriptions[0].split('(')[0].strip()}."
        
        return f"I can see: {', '.join(descriptions[:-1])} and {descriptions[-1].split('(')[0].strip()}."
    
    async def count_objects(self, image: np.ndarray) -> dict[str, int]:
        """Count objects by category."""
        detections = await self.detect_objects(image)
        
        counts: dict[str, int] = {}
        for obj in detections:
            if obj.confidence > 0.5:
                counts[obj.label] = counts.get(obj.label, 0) + 1
        
        return counts
