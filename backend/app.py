# app.py - OPTIMIZED VERSION

import os
import time
import logging
import threading

from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt

import numpy as np


# ============================================================
# BLUEPRINT IMPORTS
# ============================================================

from auth.routes import auth_bp

try:
    from student.registration import student_registration_bp
except ImportError:
    student_registration_bp = None

try:
    from student.updatedetails import student_update_bp
except ImportError:
    student_update_bp = None

try:
    from student.demo_session import demo_session_bp
except ImportError:
    demo_session_bp = None

try:
    from student.view_attendance import attendance_bp
except ImportError:
    attendance_bp = None

try:
    from teacher.attendance_records import attendance_session_bp
except ImportError:
    attendance_session_bp = None


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# MONGODB
# ============================================================

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://localhost:27017/"
)

DB_NAME = os.getenv(
    "DATABASE_NAME",
    "facerecognition"
)

COLLECTION_NAME = os.getenv(
    "COLLECTION_NAME",
    "students"
)

THRESHOLD = float(
    os.getenv("THRESHOLD", "0.6")
)


client = MongoClient(MONGODB_URI)

db = client[DB_NAME]

students_collection = db[COLLECTION_NAME]

attendance_db = client["facerecognition_db"]

attendance_collection = attendance_db["attendance_records"]


# ============================================================
# MODEL MANAGER
# ============================================================

class ModelManager:
    """
    Singleton class responsible for loading and sharing
    face-recognition models.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):

        if cls._instance is None:

            with cls._lock:

                if cls._instance is None:

                    cls._instance = super().__new__(cls)

                    cls._instance._initialize_models()

        return cls._instance


    # --------------------------------------------------------
    # MODEL INITIALIZATION
    # --------------------------------------------------------

    def _initialize_models(self):

        logger.info("🤖 Starting model initialization...")

        start_time = time.time()

        self.models_ready = False
        self.detector = None
        self.deepface_ready = False

        try:

            # =================================================
            # MTCNN
            # =================================================

            from mtcnn import MTCNN

            logger.info("Loading MTCNN detector...")

            self.detector = MTCNN()

            logger.info(
                "✅ MTCNN detector loaded successfully"
            )


            # =================================================
            # DEEPFACE
            # =================================================

            from deepface import DeepFace

            logger.info(
                "Warming up DeepFace Facenet512 model..."
            )

            dummy_img = np.zeros(
                (160, 160, 3),
                dtype=np.uint8
            )

            DeepFace.represent(
                dummy_img,
                model_name="Facenet512",
                detector_backend="skip",
                enforce_detection=False
            )


            dummy_img_2 = np.ones(
                (224, 224, 3),
                dtype=np.uint8
            ) * 128

            DeepFace.represent(
                dummy_img_2,
                model_name="Facenet512",
                detector_backend="skip",
                enforce_detection=False
            )


            self.deepface_ready = True

            logger.info(
                "✅ DeepFace Facenet512 model warmed up successfully"
            )


            self.models_ready = True

            initialization_time = time.time() - start_time

            logger.info(
                f"🎉 All models initialized successfully "
                f"in {initialization_time:.2f} seconds"
            )


        except Exception as e:

            logger.error(
                f"❌ Model initialization failed: {e}"
            )

            self.models_ready = False

            raise


    # --------------------------------------------------------
    # GET DETECTOR
    # --------------------------------------------------------

    def get_detector(self):

        if not self.models_ready:

            raise RuntimeError(
                "Models not properly initialized"
            )

        return self.detector


    # --------------------------------------------------------
    # MODEL STATUS
    # --------------------------------------------------------

    def is_ready(self):

        return (
            self.models_ready
            and self.deepface_ready
        )


    # --------------------------------------------------------
    # HEALTH CHECK
    # --------------------------------------------------------

    def health_check(self):

        try:

            if not self.models_ready:

                return False


            # Test MTCNN

            test_img = np.random.randint(
                0,
                255,
                (100, 100, 3),
                dtype=np.uint8
            )

            self.detector.detect_faces(test_img)


            # Test DeepFace

            from deepface import DeepFace

            test_face = np.random.randint(
                0,
                255,
                (160, 160, 3),
                dtype=np.uint8
            )

            DeepFace.represent(
                test_face,
                model_name="Facenet512",
                detector_backend="skip",
                enforce_detection=False
            )


            return True


        except Exception as e:

            logger.error(
                f"Model health check failed: {e}"
            )

            return False


# ============================================================
# INITIALIZE MODELS
# ============================================================

logger.info("Initializing Model Manager...")

model_manager = ModelManager()


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)


# ============================================================
# CORS CONFIGURATION
# ============================================================

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
        },
        r"/health": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
        }
    }
)


# ============================================================
# FLASK CONFIG
# ============================================================

app.config["DB"] = db

app.config["COLLECTION_NAME"] = COLLECTION_NAME

app.config["THRESHOLD"] = THRESHOLD

app.config[
    "ATTENDANCE_COLLECTION"
] = attendance_collection

app.config[
    "MODEL_MANAGER"
] = model_manager

app.config[
    "MTCNN_DETECTOR"
] = model_manager.get_detector()


# ============================================================
# BCRYPT
# ============================================================

bcrypt = Bcrypt(app)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health_check():

    model_status = model_manager.is_ready()

    model_health = model_manager.health_check()

    return {
        "status": (
            "healthy"
            if model_status and model_health
            else "unhealthy"
        ),
        "models_ready": model_status,
        "models_healthy": model_health,
        "timestamp": time.time()
    }


# ============================================================
# REGISTER BLUEPRINTS
# ============================================================

app.register_blueprint(auth_bp)


if student_registration_bp:

    app.register_blueprint(
        student_registration_bp
    )

    logger.info(
        "✅ Student registration blueprint registered"
    )


if student_update_bp:

    app.register_blueprint(
        student_update_bp
    )

    logger.info(
        "✅ Student update blueprint registered"
    )


if demo_session_bp:

    app.register_blueprint(
        demo_session_bp
    )

    logger.info(
        "✅ Demo session blueprint registered"
    )


if attendance_bp:

    app.register_blueprint(
        attendance_bp
    )

    logger.info(
        "✅ Attendance blueprint registered"
    )


if attendance_session_bp:

    app.register_blueprint(
        attendance_session_bp
    )

    logger.info(
        "✅ Attendance session blueprint registered"
    )


# ============================================================
# PRINT ROUTES
# ============================================================

logger.info("\nRegistered Flask Routes:")

for rule in app.url_map.iter_rules():

    logger.info(
        f"  {rule}"
    )


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    logger.info(
        "🚀 Starting Flask server..."
    )


    if model_manager.is_ready():

        logger.info(
            "🎯 All systems ready! "
            "Server starting on http://0.0.0.0:5000"
        )

        app.run(
            host="0.0.0.0",
            port=5000,
            debug=False
        )

    else:

        logger.error(
            "❌ Cannot start server - models not ready"
        )

        exit(1)