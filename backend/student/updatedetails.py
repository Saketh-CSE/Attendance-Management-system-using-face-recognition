from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
import time

student_update_bp = Blueprint("student_update", __name__)


def get_collection():
    db = current_app.config.get("DB")
    return db.students


def serialize_student(student):
    if not student:
        return None

    student["_id"] = str(student["_id"])

    # Never send face embeddings to frontend
    student.pop("embeddings", None)
    student.pop("embedding", None)

    return student


# ============================================================
# GET ALL STUDENTS
# ============================================================

@student_update_bp.route("/api/students", methods=["GET"])
def get_students():
    try:
        students_col = get_collection()

        department = request.args.get("department", "").strip()
        year = request.args.get("year", "").strip()
        search = request.args.get("search", "").strip()

        query = {}

        if department:
            query["department"] = department

        if year:
            query["year"] = year

        if search:
            query["$or"] = [
                {
                    "studentName": {
                        "$regex": search,
                        "$options": "i"
                    }
                },
                {
                    "studentId": {
                        "$regex": search,
                        "$options": "i"
                    }
                },
                {
                    "email": {
                        "$regex": search,
                        "$options": "i"
                    }
                }
            ]

        students = list(
            students_col
            .find(query, {"embeddings": 0, "embedding": 0})
            .sort("studentName", 1)
        )

        students = [
            serialize_student(student)
            for student in students
        ]

        return jsonify({
            "success": True,
            "students": students,
            "count": len(students)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# GET SINGLE STUDENT
# ============================================================

@student_update_bp.route("/api/students/<student_id>", methods=["GET"])
def get_student(student_id):
    try:
        students_col = get_collection()

        # First try Student ID
        student = students_col.find_one(
            {"studentId": student_id},
            {"embeddings": 0, "embedding": 0}
        )

        # Then try MongoDB ObjectId
        if not student:
            try:
                student = students_col.find_one(
                    {"_id": ObjectId(student_id)},
                    {"embeddings": 0, "embedding": 0}
                )
            except Exception:
                pass

        if not student:
            return jsonify({
                "success": False,
                "error": "Student not found"
            }), 404

        return jsonify({
            "success": True,
            "student": serialize_student(student)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# UPDATE STUDENT
# ============================================================

@student_update_bp.route("/api/students/<student_id>", methods=["PUT"])
def update_student(student_id):
    try:
        students_col = get_collection()
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Find student
        student = None

        try:
            student = students_col.find_one({
                "_id": ObjectId(student_id)
            })
        except Exception:
            pass

        if not student:
            student = students_col.find_one({
                "studentId": student_id
            })

        if not student:
            return jsonify({
                "success": False,
                "error": "Student not found"
            }), 404

        # Check Student ID uniqueness
        new_student_id = data.get(
            "studentId",
            student.get("studentId")
        )

        if new_student_id != student.get("studentId"):
            existing = students_col.find_one({
                "studentId": new_student_id,
                "_id": {
                    "$ne": student["_id"]
                }
            })

            if existing:
                return jsonify({
                    "success": False,
                    "error": "Student ID already exists"
                }), 400

        # Check email uniqueness
        new_email = data.get(
            "email",
            student.get("email")
        )

        if new_email != student.get("email"):
            existing = students_col.find_one({
                "email": new_email,
                "_id": {
                    "$ne": student["_id"]
                }
            })

            if existing:
                return jsonify({
                    "success": False,
                    "error": "Email already registered"
                }), 400

        update_data = {
            "studentName": data.get(
                "studentName",
                student.get("studentName")
            ),
            "studentId": new_student_id,
            "department": data.get(
                "department",
                student.get("department")
            ),
            "year": data.get(
                "year",
                student.get("year")
            ),
            "division": data.get(
                "division",
                student.get("division")
            ),
            "semester": data.get(
                "semester",
                student.get("semester")
            ),
            "email": new_email,
            "phoneNumber": data.get(
                "phoneNumber",
                student.get("phoneNumber")
            ),
            "status": data.get(
                "status",
                student.get("status", "active")
            ),
            "updated_at": time.time()
        }

        result = students_col.update_one(
            {"_id": student["_id"]},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            return jsonify({
                "success": True,
                "message": "No changes were made"
            })

        return jsonify({
            "success": True,
            "message": "Student updated successfully"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# DELETE STUDENT
# ============================================================

@student_update_bp.route(
    "/api/students/<student_id>",
    methods=["DELETE"]
)
def delete_student(student_id):
    try:
        students_col = get_collection()

        student = None

        # Try ObjectId
        try:
            student = students_col.find_one({
                "_id": ObjectId(student_id)
            })
        except Exception:
            pass

        # Try Student ID
        if not student:
            student = students_col.find_one({
                "studentId": student_id
            })

        if not student:
            return jsonify({
                "success": False,
                "error": "Student not found"
            }), 404

        students_col.delete_one({
            "_id": student["_id"]
        })

        return jsonify({
            "success": True,
            "message": f"Student {student.get('studentName', '')} deleted successfully"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# SEARCH STUDENTS
# ============================================================

@student_update_bp.route(
    "/api/students/search",
    methods=["GET"]
)
def search_students():
    try:
        students_col = get_collection()

        search_term = request.args.get("q", "").strip()
        department = request.args.get(
            "department",
            ""
        ).strip()
        year = request.args.get(
            "year",
            ""
        ).strip()

        if not search_term and not department and not year:
            return jsonify({
                "success": False,
                "error": "Search term or filter required"
            }), 400

        query = {}

        if search_term:
            query["$or"] = [
                {
                    "studentName": {
                        "$regex": search_term,
                        "$options": "i"
                    }
                },
                {
                    "studentId": {
                        "$regex": search_term,
                        "$options": "i"
                    }
                },
                {
                    "email": {
                        "$regex": search_term,
                        "$options": "i"
                    }
                }
            ]

        if department:
            query["department"] = department

        if year:
            query["year"] = year

        students = list(
            students_col
            .find(
                query,
                {
                    "embeddings": 0,
                    "embedding": 0
                }
            )
            .sort("studentName", 1)
            .limit(50)
        )

        students = [
            serialize_student(student)
            for student in students
        ]

        return jsonify({
            "success": True,
            "students": students,
            "count": len(students)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# STUDENT STATISTICS
# ============================================================

@student_update_bp.route(
    "/api/students/stats",
    methods=["GET"]
)
def get_student_stats():
    try:
        students_col = get_collection()

        total_students = students_col.count_documents({})

        face_registered = students_col.count_documents({
            "$or": [
                {
                    "embeddings": {
                        "$exists": True,
                        "$ne": []
                    }
                },
                {
                    "embedding": {
                        "$exists": True,
                        "$ne": None
                    }
                }
            ]
        })

        department_pipeline = [
            {
                "$group": {
                    "_id": "$department",
                    "count": {
                        "$sum": 1
                    }
                }
            },
            {
                "$sort": {
                    "count": -1
                }
            }
        ]

        year_pipeline = [
            {
                "$group": {
                    "_id": "$year",
                    "count": {
                        "$sum": 1
                    }
                }
            },
            {
                "$sort": {
                    "_id": 1
                }
            }
        ]

        by_department = list(
            students_col.aggregate(
                department_pipeline
            )
        )

        by_year = list(
            students_col.aggregate(
                year_pipeline
            )
        )

        return jsonify({
            "success": True,
            "stats": {
                "total_students": total_students,
                "face_registered": face_registered,
                "by_department": by_department,
                "by_year": by_year
            }
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500