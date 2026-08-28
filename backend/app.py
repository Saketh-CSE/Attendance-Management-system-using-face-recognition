# app.py - FREE DEPLOYMENT OPTIMIZED VERSION

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


# ============================================================
# MONGODB CONNECTION
# ============================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=10000
)

db = client[DB_NAME]

students_collection = db[COLLECTION_NAME]

attendance_db = client["facerecognition_db"]

attendance_collection = attendance_db["attendance_records"]


# ============================================================
# MODEL MANAGER
# ============================================================

class ModelManager:
    """
    Manages the face recognition models.

    IMPORTANT:
    MTCNN is initialized during startup.
    DeepFace / Facenet512 is NOT initialized during startup.

    This prevents Render Free's 512 MB instance from running
    out of memory before the Flask server opens its port.
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

        logger.info("Starting lightweight model initialization...")

        start_time = time.time()

        self.models_ready = False
        self.detector = None

        # DeepFace is intentionally NOT loaded at startup.
        self.deepface_ready = False
        self._deepface = None

        try:

            # =================================================
            # MTCNN
            # =================================================

            from mtcnn import MTCNN

            logger.info("Loading MTCNN detector...")

            self.detector = MTCNN()

            logger.info(
                "MTCNN detector loaded successfully"
            )


            # =================================================
            # DO NOT LOAD FACENET512 HERE
            # =================================================

            logger.info(
                "DeepFace Facenet512 startup warm-up skipped."
            )

            logger.info(
                "DeepFace will be loaded only when required."
            )


            # =================================================
            # MARK BASIC SERVER MODELS READY
            # =================================================

            self.models_ready = True

            initialization_time = time.time() - start_time

            logger.info(
                f"Lightweight models initialized "
                f"in {initialization_time:.2f} seconds"
            )


        except Exception as e:

            logger.error(
                f"Model initialization failed: {e}"
            )

            self.models_ready = False

            raise


    # --------------------------------------------------------
    # GET DETECTOR
    # --------------------------------------------------------

    def get_detector(self):

        if not self.models_ready:

            raise RuntimeError(
                "MTCNN detector is not ready"
            )

        return self.detector


    # --------------------------------------------------------
    # LAZY DEEPFACE LOADER
    # --------------------------------------------------------

    def load_deepface(self):

        """
        Loads DeepFace only when it is actually needed.

        This prevents Facenet512 from being loaded during
        Gunicorn/Flask startup.
        """

        if self._deepface is not None:

            return self._deepface


        with self._lock:

            if self._deepface is not None:

                return self._deepface

            logger.info(
                "Loading DeepFace Facenet512 on demand..."
            )

            try:

                from deepface import DeepFace

                self._deepface = DeepFace

                self.deepface_ready = True

                logger.info(
                    "DeepFace Facenet512 loaded successfully."
                )

                return self._deepface

            except Exception as e:

                self.deepface_ready = False

                logger.error(
                    f"Failed to load DeepFace: {e}"
                )

                raise


    # --------------------------------------------------------
    # MODEL STATUS
    # --------------------------------------------------------

    def is_ready(self):

        # Server is ready as soon as the lightweight detector
        # is initialized.
        return self.models_ready


    # --------------------------------------------------------
    # DEEPFACE STATUS
    # --------------------------------------------------------

    def is_deepface_ready(self):

        return self.deepface_ready


    # --------------------------------------------------------
    # HEALTH CHECK
    # --------------------------------------------------------

    def health_check(self):

        """
        Lightweight health check.

        IMPORTANT:
        Do NOT call Facenet512 here.

        /health must respond without loading a 95 MB model
        and without performing TensorFlow inference.
        """

        try:

            if not self.models_ready:

                return False


            # Lightweight MTCNN availability check.

            if self.detector is None:

                return False


            return True


        except Exception as e:

            logger.error(
                f"Model health check failed: {e}"
            )

            return False


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)


# ============================================================
# INITIALIZE MODEL MANAGER
# ============================================================

logger.info(
    "Initializing Model Manager..."
)

model_manager = ModelManager()


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

    # Lightweight health check.
    # Facenet512 is intentionally NOT loaded here.

    model_health = model_manager.health_check()

    return {
        "status": (
            "healthy"
            if model_status and model_health
            else "unhealthy"
        ),

        "models_ready": model_status,

        "models_healthy": model_health,

        "deepface_loaded": model_manager.is_deepface_ready(),

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
        "Student registration blueprint registered"
    )


if student_update_bp:

    app.register_blueprint(
        student_update_bp
    )

    logger.info(
        "Student update blueprint registered"
    )


if demo_session_bp:

    app.register_blueprint(
        demo_session_bp
    )

    logger.info(
        "Demo session blueprint registered"
    )


if attendance_bp:

    app.register_blueprint(
        attendance_bp
    )

    logger.info(
        "Attendance blueprint registered"
    )


if attendance_session_bp:

    app.register_blueprint(
        attendance_session_bp
    )

    logger.info(
        "Attendance session blueprint registered"
    )


# ============================================================
# PRINT ROUTES
# ============================================================

logger.info(
    "\nRegistered Flask Routes:"
)

for rule in app.url_map.iter_rules():

    logger.info(
        f"  {rule}"
    )


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    logger.info(
        "Starting Flask server..."
    )

    if model_manager.is_ready():

        logger.info(
            "All lightweight systems ready! "
            "Server starting on http://0.0.0.0:5000"
        )

        app.run(
            host="0.0.0.0",
            port=int(os.getenv("PORT", "5000")),
            debug=False
        )

    else:

        logger.error(
            "Cannot start server - basic models not ready"
        )

        raise SystemExit(1)