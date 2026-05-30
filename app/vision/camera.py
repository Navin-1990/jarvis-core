"""
Camera Manager - Handles camera access and streaming
"""

import base64
import io
from typing import Optional
from PIL import Image
import numpy as np

from app.core.logger import Logger


class CameraManager:
    """Manages camera access and image capture for JARVIS vision system."""
    
    def __init__(self) -> None:
        self._camera = None
        self._is_active = False
        self._resolution = (640, 480)
        self._last_frame: Optional[np.ndarray] = None
    
    async def initialize(self, camera_index: int = 0) -> bool:
        """Initialize the camera."""
        try:
            # Try to import OpenCV
            import cv2
            self._camera = cv2.VideoCapture(camera_index)
            
            if not self._camera.isOpened():
                Logger.warn("Could not open camera")
                return False
            
            # Set resolution
            self._camera.set(cv2.CAP_PROP_FRAME_WIDTH, self._resolution[0])
            self._camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self._resolution[1])
            
            self._is_active = True
            Logger.success("Camera initialized successfully")
            return True
            
        except ImportError:
            Logger.warn("OpenCV not available, using mock camera")
            self._is_active = True
            return True
        except Exception as e:
            Logger.error(f"Camera initialization error: {e}")
            return False
    
    async def capture_frame(self) -> Optional[bytes]:
        """Capture a single frame from the camera."""
        if not self._is_active:
            return None
            
        try:
            import cv2
            
            if self._camera is not None and self._camera.isOpened():
                ret, frame = self._camera.read()
                if ret:
                    self._last_frame = frame
                    # Convert to JPEG
                    _, buffer = cv2.imencode('.jpg', frame)
                    return buffer.tobytes()
            return None
            
        except Exception as e:
            Logger.error(f"Frame capture error: {e}")
            return None
    
    async def capture_base64(self) -> Optional[str]:
        """Capture a frame and return as base64 string."""
        frame_bytes = await self.capture_frame()
        if frame_bytes:
            return base64.b64encode(frame_bytes).decode('utf-8')
        return None
    
    def get_frame_array(self) -> Optional[np.ndarray]:
        """Get the last captured frame as numpy array."""
        return self._last_frame
    
    async def set_resolution(self, width: int, height: int) -> None:
        """Set camera resolution."""
        self._resolution = (width, height)
        if self._camera is not None:
            self._camera.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            self._camera.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    
    def is_active(self) -> bool:
        """Check if camera is active."""
        return self._is_active
    
    def close(self) -> None:
        """Release camera resources."""
        if self._camera is not None:
            self._camera.release()
            self._camera = None
        self._is_active = False
        Logger.info("Camera closed")
    
    @staticmethod
    def encode_image_to_base64(image: np.ndarray) -> str:
        """Encode a numpy image array to base64 string."""
        try:
            _, buffer = cv2.imencode('.jpg', image)
            return base64.b64encode(buffer).decode('utf-8')
        except:
            return ""
    
    @staticmethod
    def decode_base64_to_image(base64_string: str) -> Optional[np.ndarray]:
        """Decode a base64 string to numpy image array."""
        try:
            import cv2
            image_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(image_data, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except:
            return None
