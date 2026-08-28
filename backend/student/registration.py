from flask import Blueprint, request, jsonify, current_app
import time
import base64
import numpy as np
from PIL import Image
import io
from deepface import DeepFace
from mtcnn import MTCNN
import logging


student_registration_bp = Blueprint(
    "student_registration",
    __name__
)

logger = logging.getLogger(__name__)

# One detector instance for registration
detector = MTCNN()


# ============================================================
# IMAGE HELPERS
# ============================================================

def read_image_from_bytes(image_bytes):
    """
    Convert image bytes into RGB numpy array.
    """
    image = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    return np.array(image)


def decode_base64_image(image_b64):
    """
    Decode a base64 image.

    Supports both:
        data:image/jpeg;base64,...
    and raw base64 strings.
    """

    if not isinstance(image_b64, str):
        raise ValueError("Image must be a base64 string")

    if image_b64.startswith("data:"):
        if "," not in image_b64:
            raise ValueError("Invalid data URL")

        image_b64 = image_b64.split(",", 1)[1]

    try:
        return base64.b64decode(
            image_b64,
            validate=True
        )
    except Exception as e:
        raise ValueError(
            f"Invalid base64 image: {e}"
        )


def detect_faces_rgb(rgb_image):
    """
    Detect faces using MTCNN.
    Registration requires exactly one face.
    """

    try:
        detections = detector.detect_faces(
            rgb_image
        )
    except Exception as e:
        logger.error(
            f"MTCNN detection error: {e}"
        )
        return []

    faces = []

    for detection in detections:

        confidence = float(
            detection.get(
                "confidence",
                0
            )
        )

        if confidence < 0.85:
            continue

        x, y, w, h = detection.get(
            "box",
            (0, 0, 0, 0)
        )

        x = max(0, int(x))
        y = max(0, int(y))
        w = int(w)
        h = int(h)

        if w < 40 or h < 40:
            continue

        # Prevent coordinates from exceeding image size
        image_height, image_width = (
            rgb_image.shape[:2]
        )

        x2 = min(
            image_width,
            x + w
        )

        y2 = min(
            image_height,
            y + h
        )

        if x2 <= x or y2 <= y:
            continue

        face_rgb = rgb_image[
            y:y2,
            x:x2
        ]

        if (
            face_rgb.shape[0] < 40
            or face_rgb.shape[1] < 40
        ):
            continue

        faces.append({
            "box": (
                x,
                y,
                x2 - x,
                y2 - y
            ),
            "face": face_rgb,
            "confidence": confidence
        })

    return faces


def extract_embedding(face_rgb):
    """
    Generate FaceNet512 embedding.
    """

    try:

        if face_rgb is None:
            return None

        if (
            face_rgb.shape[0] < 40
            or face_rgb.shape[1] < 40
        ):
            return None

        face_image = Image.fromarray(
            face_rgb.astype("uint8")
        )

        face_image = face_image.resize(
            (160, 160),
            Image.Resampling.LANCZOS
        )

        face_array = np.array(
            face_image
        )

        representation = DeepFace.represent(
            face_array,
            model_name="Facenet512",
            detector_backend="skip",
            enforce_detection=False
        )

        if not representation:
            return None

        embedding = representation[0].get(
            "embedding"
        )

        if not embedding:
            return None

        return np.asarray(
            embedding,
            dtype=np.float32
        )

    except Exception as e:

        logger.error(
            f"Embedding extraction error: {e}"
        )

        return None


# ============================================================
# VALIDATION HELPERS
# ============================================================

REQUIRED_FIELDS = [
    "studentName",
    "studentId",
    "department",
    "year",
    "division",
    "semester",
    "email",
    "phoneNumber",
    "images"
]


def clean_string(value):
    if value is None:
        return ""

    return str(value).strip()


# ============================================================
# REGISTER STUDENT
# ============================================================

@student_registration_bp.route(
    "/api/register-student",
    methods=["POST"]
)
def register_student():

    start_time = time.time()

    try:

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        db = current_app.config.get("DB")

        if db is None:
            return jsonify({
                "success": False,
                "error": "Database connection unavailable"
            }), 500

        students_col = db.students

        # ----------------------------------------------------
        # REQUEST
        # ----------------------------------------------------

        data = request.get_json(
            silent=True
        )

        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid JSON data"
            }), 400

        # ----------------------------------------------------
        # REQUIRED FIELDS
        # ----------------------------------------------------

        for field in REQUIRED_FIELDS:

            if field not in data:

                return jsonify({
                    "success": False,
                    "error": f"{field} is required"
                }), 400

        # ----------------------------------------------------
        # CLEAN FORM VALUES
        # ----------------------------------------------------

        student_name = clean_string(
            data.get("studentName")
        )

        student_id = clean_string(
            data.get("studentId")
        )

        department = clean_string(
            data.get("department")
        )

        year = clean_string(
            data.get("year")
        )

        division = clean_string(
            data.get("division")
        )

        semester = clean_string(
            data.get("semester")
        )

        email = clean_string(
            data.get("email")
        ).lower()

        phone_number = clean_string(
            data.get("phoneNumber")
        )

        # ----------------------------------------------------
        # FIELD VALIDATION
        # ----------------------------------------------------

        values = {
            "studentName": student_name,
            "studentId": student_id,
            "department": department,
            "year": year,
            "division": division,
            "semester": semester,
            "email": email,
            "phoneNumber": phone_number
        }

        for field, value in values.items():

            if not value:

                return jsonify({
                    "success": False,
                    "error": f"{field} is required"
                }), 400

        # ----------------------------------------------------
        # IMAGE VALIDATION
        # ----------------------------------------------------

        images = data.get("images")

        if not isinstance(images, list):

            return jsonify({
                "success": False,
                "error": "images must be an array"
            }), 400

        if len(images) != 5:

            return jsonify({
                "success": False,
                "error": (
                    "Exactly 5 images are required. "
                    f"Received {len(images)}."
                )
            }), 400

        # ----------------------------------------------------
        # DUPLICATE STUDENT ID
        # ----------------------------------------------------

        existing_student = students_col.find_one({
            "studentId": student_id
        })

        if existing_student:

            return jsonify({
                "success": False,
                "error": (
                    f"Student ID '{student_id}' "
                    "already exists"
                )
            }), 400

        # ----------------------------------------------------
        # DUPLICATE EMAIL
        # ----------------------------------------------------

        existing_email = students_col.find_one({
            "email": email
        })

        if existing_email:

            return jsonify({
                "success": False,
                "error": (
                    "Email already registered"
                )
            }), 400

        # ----------------------------------------------------
        # PROCESS FIVE FACE IMAGES
        # ----------------------------------------------------

        embeddings = []

        for index, image_b64 in enumerate(images):

            image_number = index + 1

            # Decode image
            try:

                image_bytes = decode_base64_image(
                    image_b64
                )

                rgb_image = read_image_from_bytes(
                    image_bytes
                )

            except Exception as e:

                return jsonify({
                    "success": False,
                    "error": (
                        f"Invalid image data "
                        f"at image {image_number}: {e}"
                    )
                }), 400

            # Detect face
            faces = detect_faces_rgb(
                rgb_image
            )

            # Exactly one face required
            if len(faces) == 0:

                return jsonify({
                    "success": False,
                    "error": (
                        f"No face detected "
                        f"in image {image_number}. "
                        "Make sure your face is clearly visible."
                    )
                }), 400

            if len(faces) > 1:

                return jsonify({
                    "success": False,
                    "error": (
                        f"Multiple faces detected "
                        f"in image {image_number}. "
                        "Only one person should be visible."
                    )
                }), 400

            # Extract embedding
            embedding = extract_embedding(
                faces[0]["face"]
            )

            if embedding is None:

                return jsonify({
                    "success": False,
                    "error": (
                        "Failed to extract face "
                        f"features from image {image_number}."
                    )
                }), 500

            embeddings.append(
                embedding.tolist()
            )

            logger.info(
                f"Processed face image "
                f"{image_number}/5 for "
                f"student {student_id}"
            )

        # ----------------------------------------------------
        # FINAL DATABASE DOCUMENT
        # ----------------------------------------------------

        now = time.time()

        student_data = {
            "studentId": student_id,
            "studentName": student_name,

            "department": department,
            "year": year,
            "division": division,
            "semester": semester,

            "email": email,
            "phoneNumber": phone_number,

            "status": "active",

            # Five FaceNet512 embeddings
            "embeddings": embeddings,

            "face_registered": True,

            "created_at": now,
            "updated_at": now
        }

        # ----------------------------------------------------
        # INSERT
        # ----------------------------------------------------

        result = students_col.insert_one(
            student_data
        )

        processing_time = (
            time.time() - start_time
        )

        logger.info(
            f"Student registered successfully: "
            f"{student_name} ({student_id})"
        )

        logger.info(
            f"Registration processing time: "
            f"{processing_time:.2f}s"
        )

        return jsonify({
            "success": True,
            "message": (
                "Student registered successfully"
            ),
            "studentId": student_id,
            "studentName": student_name,
            "record_id": str(
                result.inserted_id
            ),
            "face_registered": True,
            "embedding_count": len(
                embeddings
            ),
            "processing_time": round(
                processing_time,
                3
            )
        }), 200

    except Exception as e:

        logger.exception(
            "Student registration error"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# STUDENT COUNT
# ============================================================

@student_registration_bp.route(
    "/api/students/count",
    methods=["GET"]
)
def get_student_count():

    try:

        db = current_app.config.get("DB")

        if db is None:
            return jsonify({
                "success": False,
                "error": "Database unavailable"
            }), 500

        count = db.students.count_documents({})

        return jsonify({
            "success": True,
            "count": count
        })

    except Exception as e:

        current_app.logger.exception(
            "Error getting student count"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# DEPARTMENTS
# ============================================================

@student_registration_bp.route(
    "/api/students/departments",
    methods=["GET"]
)
def get_departments():

    try:

        db = current_app.config.get("DB")

        if db is None:
            return jsonify({
                "success": False,
                "error": "Database unavailable"
            }), 500

        departments = db.students.distinct(
            "department"
        )

        departments = sorted(
            [
                str(department)
                for department in departments
                if department
            ]
        )

        return jsonify({
            "success": True,
            "departments": departments,
            "count": len(departments)
        })

    except Exception as e:

        current_app.logger.exception(
            "Error getting departments"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500