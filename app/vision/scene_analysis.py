"""
Scene Analysis Module - Understands scenes and contexts
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np

from app.core.logger import Logger
from app.vision.object_detection import ObjectDetection, ObjectDetectionResult
from app.vision.face_recognition import FaceRecognition, FaceDetection


@dataclass
class SceneAnalysisResult:
    """Represents the analysis of a scene."""
    description: str
    objects: list[ObjectDetectionResult]
    faces: list[FaceDetection]
    dominant_category: str
    lighting: str
    indoor_outdoor: str
    confidence: float


class SceneAnalysis:
    """Scene understanding system for JARVIS vision."""
    
    # Scene context templates
    SCENE_TEMPLATES = {
        "office": {
            "keywords": ["desk", "computer", "laptop", "monitor", "keyboard", "chair", "paper", "book", "phone", "mug", "cup"],
            "description": "an office workspace"
        },
        "kitchen": {
            "keywords": ["refrigerator", "oven", "microwave", "sink", "plate", "fork", "knife", "spoon", "bowl", "cup", "mug"],
            "description": "a kitchen"
        },
        "living_room": {
            "keywords": ["couch", "sofa", "tv", "remote", "chair", "table", "lamp", "plant", "bookshelf"],
            "description": "a living room"
        },
        "bedroom": {
            "keywords": ["bed", "pillow", "lamp", "chair", "desk", "closet", "mirror"],
            "description": "a bedroom"
        },
        "outdoor": {
            "keywords": ["car", "tree", "sky", "road", "building", "person", "dog", "cat", "bicycle"],
            "description": "an outdoor scene"
        },
        "street": {
            "keywords": ["car", "bus", "truck", "bicycle", "person", "building", "road", "sidewalk", "traffic", "light"],
            "description": "a street"
        },
        "nature": {
            "keywords": ["tree", "grass", "sky", "flower", "plant", "bird", "water", "lake", "mountain", "sun", "cloud"],
            "description": "a natural setting"
        },
    }
    
    def __init__(self) -> None:
        self._object_detector = ObjectDetection()
        self._face_recognition = FaceRecognition()
        self._initialized = False
    
    async def initialize(self) -> bool:
        """Initialize scene analysis components."""
        try:
            await self._object_detector.initialize()
            await self._face_recognition.initialize()
            self._initialized = True
            Logger.success("Scene analysis initialized")
            return True
        except Exception as e:
            Logger.error(f"Scene analysis initialization error: {e}")
            return False
    
    async def analyze_scene(self, image: np.ndarray) -> SceneAnalysisResult:
        """Analyze an entire scene."""
        if not self._initialized:
            await self.initialize()
        
        # Detect objects
        objects = await self._object_detector.detect_objects(image)
        
        # Detect faces
        faces = await self._face_recognition.detect_faces(image)
        
        # Analyze the scene context
        object_labels = [obj.label.lower() for obj in objects if obj.confidence > 0.5]
        
        # Determine dominant category
        dominant_category = self._categorize_scene(object_labels)
        
        # Analyze lighting (simplified)
        lighting = self._analyze_lighting(image)
        
        # Determine indoor/outdoor
        indoor_outdoor = self._determine_environment(object_labels)
        
        # Generate description
        description = await self._generate_description(objects, faces, dominant_category)
        
        return SceneAnalysisResult(
            description=description,
            objects=objects,
            faces=faces,
            dominant_category=dominant_category,
            lighting=lighting,
            indoor_outdoor=indoor_outdoor,
            confidence=0.85,
        )
    
    def _categorize_scene(self, object_labels: list[str]) -> str:
        """Categorize the scene based on detected objects."""
        scores: dict[str, int] = {}
        
        for label in object_labels:
            for category, template in self.SCENE_TEMPLATES.items():
                if label in template["keywords"]:
                    scores[category] = scores.get(category, 0) + 1
        
        if not scores:
            return "unknown"
        
        return max(scores, key=scores.get)
    
    def _analyze_lighting(self, image: np.ndarray) -> str:
        """Analyze the lighting conditions (simplified)."""
        try:
            import cv2
            
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Calculate average brightness
            avg_brightness = np.mean(gray)
            
            # Calculate contrast
            contrast = np.std(gray)
            
            if avg_brightness < 80:
                return "dark"
            elif avg_brightness > 180:
                return "bright"
            elif contrast < 30:
                return "low contrast"
            elif contrast > 80:
                return "high contrast"
            else:
                return "moderate"
        except:
            return "unknown"
    
    def _determine_environment(self, object_labels: list[str]) -> str:
        """Determine if the scene is indoor or outdoor."""
        outdoor_keywords = {"tree", "sky", "cloud", "sun", "mountain", "grass", "road", "car", "bus", "building"}
        indoor_keywords = {"desk", "chair", "bed", "couch", "tv", "computer", "laptop", "refrigerator", "oven", "sink"}
        
        outdoor_count = sum(1 for label in object_labels if label in outdoor_keywords)
        indoor_count = sum(1 for label in object_labels if label in indoor_keywords)
        
        if outdoor_count > indoor_count:
            return "outdoor"
        elif indoor_count > outdoor_count:
            return "indoor"
        else:
            return "unknown"
    
    async def _generate_description(
        self, 
        objects: list[ObjectDetectionResult],
        faces: list[FaceDetection],
        category: str
    ) -> str:
        """Generate a natural language description of the scene."""
        if not objects and not faces:
            return "I see an empty scene."
        
        parts = []
        
        # Describe the environment
        template = self.SCENE_TEMPLATES.get(category)
        if template:
            parts.append(f"I see {template['description']}")
        else:
            parts.append("I see a scene")
        
        # Describe notable objects
        notable_objects = [obj for obj in objects if obj.confidence > 0.6][:5]
        if notable_objects:
            object_names = [obj.label for obj in notable_objects]
            if len(object_names) == 1:
                parts.append(f"with a {object_names[0]}")
            elif len(object_names) == 2:
                parts.append(f"with a {object_names[0]} and a {object_names[1]}")
            else:
                parts.append(f"containing {', '.join(object_names[:-1])}, and a {object_names[-1]}")
        
        # Describe people
        if faces:
            if len(faces) == 1:
                if faces[0].name:
                    parts.append(f"with {faces[0].name}")
                else:
                    parts.append("with one person")
            else:
                known_names = [f.name for f in faces if f.name]
                if known_names:
                    parts.append(f"with {', '.join(known_names)}")
                else:
                    parts.append(f"with {len(faces)} people")
        
        # Add environment details
        object_labels = [obj.label.lower() for obj in objects]
        if "desk" in object_labels or "laptop" in object_labels or "computer" in object_labels:
            parts.append("The workspace appears to be set up for productivity.")
        elif "couch" in object_labels or "tv" in object_labels:
            parts.append("This looks like a comfortable entertainment area.")
        elif "bed" in object_labels:
            parts.append("This appears to be a rest area.")
        
        return " ".join(parts) + "."
    
    async def describe_surroundings(self, image: np.ndarray) -> str:
        """Provide a verbal description of the surroundings."""
        result = await self.analyze_scene(image)
        return result.description
    
    async def detect_activities(self, image: np.ndarray) -> list[str]:
        """Detect ongoing activities in the scene."""
        objects = await self._object_detector.detect_objects(image)
        object_labels = [obj.label.lower() for obj in objects if obj.confidence > 0.5]
        
        activities = []
        
        # Detect work activities
        if any(obj in object_labels for obj in ["laptop", "computer", "keyboard", "mouse"]):
            activities.append("working on a computer")
        
        if any(obj in object_labels for obj in ["phone", "cell phone"]):
            activities.append("using a phone")
        
        if any(obj in object_labels for obj in ["book", "notebook"]):
            activities.append("reading or writing")
        
        # Detect eating/drinking
        if any(obj in object_labels for obj in ["cup", "mug", "plate", "bowl", "fork", "knife", "spoon"]):
            activities.append("eating or drinking")
        
        # Detect relaxation
        if any(obj in object_labels for obj in ["couch", "sofa", "tv", "remote"]):
            activities.append("relaxing or watching TV")
        
        # Detect movement/transport
        if any(obj in object_labels for obj in ["car", "bicycle", "motorcycle", "bus", "truck"]):
            activities.append("traveling or commuting")
        
        return activities if activities else ["No specific activity detected"]
