import axios from "axios";

export const API_BASE_URL = "/backend";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export async function getStudentCount() {
  const response = await api.get("/api/students/count");
  return response.data;
}

export async function getStudents() {
  const response = await api.get("/api/students");
  return response.data;
}

export async function getAttendance() {
  const response = await api.get("/api/attendance");
  return response.data;
}

export async function getModelStatus() {
  const response = await api.get("/api/attendance/models/status");
  return response.data;
}

export async function getDepartments() {
  const response = await api.get("/api/students/departments");
  return response.data;
}

export async function searchStudents(query: string) {
  const response = await api.get(
    `/api/students/search?q=${encodeURIComponent(query)}`
  );
  return response.data;
}

export async function getStudent(studentId: string) {
  const response = await api.get(
    `/api/students/${encodeURIComponent(studentId)}`
  );
  return response.data;
}

export async function updateStudent(
  studentId: string,
  data: any
) {
  const response = await api.put(
    `/api/update-student/${encodeURIComponent(studentId)}`,
    data
  );
  return response.data;
}

export async function deleteStudent(studentId: string) {
  const response = await api.delete(
    `/api/delete-student/${encodeURIComponent(studentId)}`
  );
  return response.data;
}