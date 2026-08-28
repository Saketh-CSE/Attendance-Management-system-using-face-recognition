from flask import Blueprint, request, jsonify, current_app

attendance_bp = Blueprint("attendance", __name__)


def serialize_datetime(value):
    if value is None:
        return None

    try:
        return value.isoformat()
    except Exception:
        return str(value)


def get_attendance_collection():
    collection = current_app.config.get(
        "ATTENDANCE_COLLECTION"
    )

    if collection is None:
        raise RuntimeError(
            "ATTENDANCE_COLLECTION is not configured"
        )

    return collection


def get_students_collection():
    db = current_app.config.get("DB")

    if db is None:
        raise RuntimeError(
            "DB is not configured"
        )

    return db.students


# ============================================================
# GET ATTENDANCE
# ============================================================

@attendance_bp.route(
    "/api/attendance",
    methods=["GET"]
)
def get_attendance():

    try:

        attendance_col = get_attendance_collection()
        students_col = get_students_collection()

        date = request.args.get("date")
        department = request.args.get("department")
        year = request.args.get("year")
        subject = request.args.get("subject")
        division = request.args.get("division")
        student_id = request.args.get("student_id")

        # ----------------------------------------------------
        # Build query for finalized sessions
        # ----------------------------------------------------

        query = {
            "finalized": True
        }

        if date:
            query["date"] = date

        if department:
            query["department"] = department

        if year:
            query["year"] = year

        if subject:
            query["subject"] = subject

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # Get newest finalized session first.
        # ----------------------------------------------------

        sessions = list(
            attendance_col.find(query).sort(
                "ended_at",
                -1
            )
        )

        attendance = []

        # ----------------------------------------------------
        # Convert session records directly into API records
        # ----------------------------------------------------

        for session in sessions:

            session_students = (
                session.get("students")
                or []
            )

            session_id = str(
                session.get("_id", "")
            )

            session_date = session.get(
                "date"
            )

            session_subject = session.get(
                "subject"
            )

            session_department = session.get(
                "department"
            )

            session_year = session.get(
                "year"
            )

            session_division = (
                session.get("division")
            )

            for entry in session_students:

                sid = (
                    entry.get("student_id")
                    or entry.get("studentId")
                )

                if not sid:
                    continue

                sid = str(sid)

                # Optional student filter
                if student_id:
                    if sid != str(student_id):
                        continue

                # ------------------------------------------------
                # Get student master data
                # ------------------------------------------------

                student = students_col.find_one({
                    "studentId": sid
                })

                if student:

                    student_name = (
                        student.get(
                            "studentName"
                        )
                        or entry.get(
                            "student_name"
                        )
                        or entry.get(
                            "studentName"
                        )
                        or ""
                    )

                    student_department = (
                        student.get(
                            "department"
                        )
                        or session_department
                        or ""
                    )

                    student_year = (
                        student.get(
                            "year"
                        )
                        or session_year
                        or ""
                    )

                    student_division = (
                        student.get(
                            "division"
                        )
                        or session_division
                        or ""
                    )

                else:

                    student_name = (
                        entry.get(
                            "student_name"
                        )
                        or entry.get(
                            "studentName"
                        )
                        or ""
                    )

                    student_department = (
                        entry.get(
                            "department"
                        )
                        or session_department
                        or ""
                    )

                    student_year = (
                        entry.get(
                            "year"
                        )
                        or session_year
                        or ""
                    )

                    student_division = (
                        entry.get(
                            "division"
                        )
                        or session_division
                        or ""
                    )

                # Optional division filter
                if division:
                    if (
                        str(student_division)
                        != str(division)
                    ):
                        continue

                # ------------------------------------------------
                # READ THE ACTUAL ATTENDANCE VALUE
                # FROM THE SESSION
                # ------------------------------------------------

                is_present = bool(
                    entry.get("present")
                )

                marked_at = serialize_datetime(
                    entry.get("marked_at")
                )

                attendance.append({

                    "id":
                        f"{session_id}_{sid}",

                    "session_id":
                        session_id,

                    "studentId":
                        sid,

                    "studentName":
                        student_name,

                    "date":
                        session_date,

                    "subject":
                        session_subject,

                    "department":
                        student_department,

                    "year":
                        student_year,

                    "division":
                        student_division,

                    "status":
                        (
                            "present"
                            if is_present
                            else "absent"
                        ),

                    "present":
                        is_present,

                    "markedAt":
                        marked_at,

                    "marked_at":
                        marked_at,

                    "finalized":
                        True
                })

        # ----------------------------------------------------
        # Statistics
        # ----------------------------------------------------

        total_students = (
            students_col.count_documents({})
        )

        present_count = sum(
            1
            for item in attendance
            if item["present"]
        )

        absent_count = sum(
            1
            for item in attendance
            if not item["present"]
        )

        total_records = (
            present_count +
            absent_count
        )

        attendance_rate = (
            round(
                present_count
                / total_records
                * 100,
                1
            )
            if total_records
            else 0
        )

        return jsonify({

            "success": True,

            "attendance":
                attendance,

            "stats": {

                "totalStudents":
                    total_students,

                "presentToday":
                    present_count,

                "absentToday":
                    absent_count,

                "attendanceRate":
                    attendance_rate
            }

        })

    except Exception as e:

        current_app.logger.exception(
            "Attendance API error"
        )

        return jsonify({

            "success": False,

            "attendance": [],

            "stats": {

                "totalStudents": 0,

                "presentToday": 0,

                "absentToday": 0,

                "attendanceRate": 0
            },

            "error":
                str(e)

        }), 500


# ============================================================
# EXPORT ATTENDANCE
# ============================================================

@attendance_bp.route(
    "/api/attendance/export",
    methods=["GET"]
)
def export_attendance():

    try:

        attendance_col = (
            get_attendance_collection()
        )

        students_col = (
            get_students_collection()
        )

        date = request.args.get("date")
        department = request.args.get(
            "department"
        )
        year = request.args.get("year")
        subject = request.args.get(
            "subject"
        )
        division = request.args.get(
            "division"
        )

        query = {
            "finalized": True
        }

        if date:
            query["date"] = date

        if department:
            query["department"] = department

        if year:
            query["year"] = year

        if subject:
            query["subject"] = subject

        sessions = list(
            attendance_col.find(query).sort(
                "ended_at",
                -1
            )
        )

        export_data = []

        for session in sessions:

            for entry in (
                session.get("students")
                or []
            ):

                sid = (
                    entry.get("student_id")
                    or entry.get("studentId")
                )

                if not sid:
                    continue

                student = students_col.find_one({
                    "studentId": sid
                })

                if student:

                    name = (
                        student.get(
                            "studentName"
                        )
                        or entry.get(
                            "student_name"
                        )
                        or ""
                    )

                    student_division = (
                        student.get(
                            "division"
                        )
                        or session.get(
                            "division"
                        )
                        or ""
                    )

                    student_department = (
                        student.get(
                            "department"
                        )
                        or session.get(
                            "department"
                        )
                        or ""
                    )

                    student_year = (
                        student.get(
                            "year"
                        )
                        or session.get(
                            "year"
                        )
                        or ""
                    )

                else:

                    name = (
                        entry.get(
                            "student_name"
                        )
                        or ""
                    )

                    student_division = (
                        entry.get(
                            "division"
                        )
                        or session.get(
                            "division"
                        )
                        or ""
                    )

                    student_department = (
                        entry.get(
                            "department"
                        )
                        or session.get(
                            "department"
                        )
                        or ""
                    )

                    student_year = (
                        entry.get(
                            "year"
                        )
                        or session.get(
                            "year"
                        )
                        or ""
                    )

                if division:

                    if (
                        str(student_division)
                        != str(division)
                    ):
                        continue

                export_data.append({

                    "studentId":
                        str(sid),

                    "name":
                        name,

                    "subject":
                        session.get(
                            "subject",
                            ""
                        ),

                    "date":
                        session.get(
                            "date",
                            ""
                        ),

                    "department":
                        student_department,

                    "year":
                        student_year,

                    "division":
                        student_division,

                    "status":
                        (
                            "present"
                            if entry.get(
                                "present"
                            )
                            else "absent"
                        )
                })

        return jsonify({

            "success": True,

            "data":
                export_data

        })

    except Exception as e:

        current_app.logger.exception(
            "Attendance export error"
        )

        return jsonify({

            "success": False,

            "data": [],

            "error":
                str(e)

        }), 500