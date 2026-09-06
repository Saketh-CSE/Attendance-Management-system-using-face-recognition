# SmartAttend — AI-Powered Face Recognition Attendance System

<p align="center">
  <strong>SmartAttend</strong><br>
  AI-powered attendance management using real-time face recognition.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Flask-Python-blue?style=for-the-badge&logo=flask" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/DeepFace-AI-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/OpenCV-Computer%20Vision-red?style=for-the-badge&logo=opencv" />
</p>

---

## 📌 Overview

**SmartAttend** is an AI-powered attendance management system designed to automate student attendance using facial recognition.

The system combines:

- Face detection
- Face recognition
- Student management
- Attendance sessions
- Attendance history
- Real-time recognition
- MongoDB Atlas
- Modern web dashboard

The goal is to reduce manual attendance work while providing a centralized and easy-to-use attendance management platform.

---

## ✨ Features

### 👨‍🎓 Student Management

- Register students
- Store student information
- Register facial data
- View registered students
- Search students
- Update student details
- Delete student records
- Department and student statistics

### 📷 AI Face Recognition

- Real-time camera-based recognition
- MTCNN face detection
- DeepFace-based facial recognition
- Face embedding comparison
- Recognition-based attendance marking
- Model status monitoring

### 📝 Attendance Management

- Create attendance sessions
- Start and end sessions
- Automatically mark recognized students
- View attendance records
- Attendance history
- Attendance statistics
- Attendance export

### 📊 Dashboard

The dashboard provides:

- Total students
- Present students
- Attendance rate
- Today's sessions
- System status
- Quick attendance actions
- Student registration shortcuts

### ⚙️ System Monitoring

The application includes a system-status section for monitoring:

- Backend health
- AI model readiness
- Recognition services
- API availability

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │       User / Admin      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     Next.js Frontend    │
                    │       React + TS        │
                    └────────────┬────────────┘
                                 │
                         /backend/*
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Flask Backend      │
                    │       REST APIs         │
                    └──────┬──────────┬───────┘
                           │          │
                           │          ▼
                           │   ┌───────────────┐
                           │   │ Face AI Layer │
                           │   │ MTCNN         │
                           │   │ DeepFace      │
                           │   │ FaceNet512    │
                           │   └───────────────┘
                           │
                           ▼
                    ┌─────────────────────────┐
                    │      MongoDB Atlas      │
                    │ Students & Attendance   │
                    └─────────────────────────┘
