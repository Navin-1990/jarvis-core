"""
Face Recognition Module - Detects and identifies faces
"""

import base64
from typing import Optional
from dataclasses import dataclass
import numpy as np

from app.core.logger import Logger


@dataclass
class FaceDetection:
    """Represents a detected face."""
    bbox: tuple[int, int, int, int]  # x, y, width, height
    confidence: float
    face_id: Optional[str] = None
    name: Optional[str] = None


class FaceRecognition:
    """Face detection and recognition system for JARVIS."""
    
    def __init__(self) -> None:
        self._detector = None
        self._recognizer = None
        self._known_faces: dict[str, np.ndarray] = {}
        self._known_names: dict[str, str] = {}
        self._initialized = False
    
    async def initialize(self) -> bool:
        """Initialize face recognition models."""
        try:
            # Try to use face_recognition library
            import face_recognition
            
            self._detector = face_recognition
            self._initialized = True
            Logger.success("Face recognition initialized")
            return True
            
        except ImportError:
            Logger.warn("face_recognition library not available, using OpenCV fallback")
            try:
                import cv2
                self._detector = cv2
                self._face_cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                )
                self._initialized = True
                return True
            except ImportError:
                Logger.error("OpenCV not available for face detection")
                return False
        except Exception as e:
            Logger.error(f"Face recognition initialization error: {e}")
            return False
    
    async def detect_faces(self, image: np.ndarray) -> list[FaceDetection]:
        """Detect faces in an image."""
        if not self._initialized:
            return []
        
        try:
            if hasattr(self, '_detector') and self._detector.__name__ == 'face_recognition':
                # Use face_recognition library
                import face_recognition
                
                # Convert BGR to RGB if needed
                if len(image.shape) == 3 and image.shape[2] == 3:
                    rgb_image = image[:, :, ::-1]
                else:
                    rgb_image = image
                
                face_locations = face_recognition.face_locations(rgb_image)
                
                detections = []
                for i, (top, right, bottom, left) in enumerate(face_locations):
                    detections.append(FaceDetection(
                        bbox=(left, top, right - left, bottom - top),
                        confidence=0.95,  # face_recognition doesn't provide confidence
                        face_id=f"face_{i}",
                    ))
                
                return detections
            else:
                # Use OpenCV cascade classifier
                gray = self._detector.cvtColor(image, self._detector.COLOR_BGR2GRAY)
                faces = self._face_cascade.detectMultiScale(
                    gray, 
                    scaleFactor=1.1, 
                    minNeighbors=5, 
                    minSize=(30, 30)
                )
                
                detections = []
                for i, (x, y, w, h) in enumerate(faces):
                    detections.append(FaceDetection(
                        bbox=(x, y, w, h),
                        confidence=0.85,
                        face_id=f"face_{i}",
                    ))
                
                return detections
                
        except Exception as e:
            Logger.error(f"Face detection error: {e}")
            return []
    
    async def recognize_face(self, face_encoding: np.ndarray) -> tuple[Optional[str], float]:
        """Recognize a face against known faces."""
        if not self._known_faces:
            return None, 0.0
        
        try:
            import face_recognition
            
            # Compare with known faces
            for face_id, known_encoding in self._known_faces.items():
                matches = face_recognition.compare_faces(
                    [known_encoding], 
                    face_encoding,
                    tolerance=0.6
                )
                
                if matches[0]:
                    distance = face_recognition.face_distance([known_encoding], face_encoding)[0]
                    confidence = 1.0 - distance
                    return self._known_names.get(face_id, "Unknown"), confidence
            
            return None, 0.0
            
        except Exception as e:
            Logger.error(f"Face recognition error: {e}")
            return None, 0.0
    
    async def enroll_face(self, image: np.ndarray, name: str) -> Optional[str]:
        """Enroll a new face into the system."""
        if not self._initialized:
            return None
        
        try:
            import face_recognition
            
            # Detect and encode face
            rgb_image = image[:, :, ::-1] if len(image.shape) == 3 else image
            face_locations = face_recognition.face_locations(rgb_image)
            
            if not face_locations:
                Logger.warn("No face detected in enrollment image")
                return None
            
            encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            if not encodings:
                return None
            
            # Generate face ID
            face_id = f"user_{name.lower().replace(' ', '_')}_{len(self._known_faces)}"
            
            # Store face data
            self._known_faces[face_id] = encodings[0]
            self._known_names[face_id] = name
            
            Logger.success(f"Enrolled face for: {name}")
            return face_id
            
        except Exception as e:
            Logger.error(f"Face enrollment error: {e}")
            return None
    
    async def describe_person(self, image: np.ndarray) -> str:
        """Generate a description of a person in the image."""
        faces = await self.detect_faces(image)
        
        if not faces:
            return "No person detected in the frame."
        
        if len(faces) == 1:
            x, y, w, h = faces[0].bbox
            if faces[0].name:
                return f"I can see {faces[0].name} in the frame."
            return f"I can see one person in the frame."
        
        names = [f.name for f in faces if f.name]
        if names:
            return f"I can see {len(faces)} people: {', '.join(names)}."
        return f"I can see {len(faces)} people in the frame."
    
    def get_known_faces(self) -> list[str]:
        """Get list of known face names."""
        return list(self._known_names.values())
    
    def remove_face(self, face_id: str) -> bool:
        """Remove a face from the enrollment database."""
        if face_id in self._known_faces:
            del self._known_faces[face_id]
            if face_id in self._known_names:
                del self._known_names[face_id]
            Logger.info(f"Removed face: {face_id}")
            return True
        return False
